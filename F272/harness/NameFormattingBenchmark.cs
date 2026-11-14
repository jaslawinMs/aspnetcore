using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Google.Api;
using Google.Protobuf;
using Google.Protobuf.Reflection;

[MemoryDiagnoser]
public class NameFormattingBenchmark
{
    private static readonly Scenario[] Scenarios =
    [
        new("Empty", "", ""),
        new("SingleLower", "a", "A"),
        new("SingleUpper", "A", "A"),
        new("Ordinary_SubData", "sub_data", "SubData"),
        new("Ordinary_RepeatedStrings", "repeated_strings", "RepeatedStrings"),
        new("Camel_RepeatedStrings", "repeated_strings", "repeatedStrings", Pascal: false),
        new("Camel_SingleUpper", "A", "a", Pascal: false),
        new("Camel_HTTP", "HTTP_server_ID", "hTTPServerID", Pascal: false),
        new("Camel_Unicode", "\u00c9T\u00c9_name", "\u00e9T\u00c9Name", Pascal: false),
        new("WordStarts_ASCII_32", string.Join("_", Enumerable.Repeat("a", 32)), new string('A', 32)),
        new("WordStarts_Greek_32", string.Join("_", Enumerable.Repeat("\u03c3", 32)), new string('\u03a3', 32)),
        new("Acronym", "HTTP_server_ID", "HTTPServerID"),
        new("Digits", "field1_sub2_name", "Field1Sub2Name"),
        new("Unicode", "\u00e9t\u00e9_name", "\u00c9t\u00e9Name"),
        new("Periods_Preserved", "foo.bar#", "Foo.Bar_", Periods: true),
        new("Periods_Removed", "foo.bar#", "FooBar_"),
        new("Marker_64", new string('x', 63) + "#", "X" + new string('x', 62) + "_"),
        new("Separators_32", new string('_', 32), ""),
        Letters("Medium_64", 64),
        Letters("Long_256", 256),
        Letters("Stress_1024", 1024),
        Letters("Stress_4096", 4096),
        new("Body_Custom", "custom", nameof(HttpRule.Custom), Kind: Operation.Body),
        new("Body_AdditionalBindings", "additional_bindings", nameof(HttpRule.AdditionalBindings), Kind: Operation.Body),
        new("BodyStar_Control", "*", "request", Kind: Operation.Star),
        new("BodyMissing_Control", "missing_field", "Couldn't find matching field for body 'missing_field' on HttpRule.", Kind: Operation.Missing),
        new("Echo_Control", "unchanged", "unchanged", Kind: Operation.Echo)
    ];

    public static IEnumerable<string> Cases => Scenarios.Select(scenario => scenario.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private Scenario _scenario = null!;
    private Func<string, bool, bool, string> _format = null!;
    private Func<string, Type, MethodDescriptor, object?> _resolve = null!;
    private MethodDescriptor _method = null!;
    private HttpRule _request = null!;

    [GlobalSetup]
    public void Setup()
    {
        _scenario = Scenarios.Single(scenario => scenario.Name == Case);
        var owner = Assembly.Load("Microsoft.AspNetCore.Grpc.JsonTranscoding")
            .GetType("Grpc.Shared.ServiceDescriptorHelpers", throwOnError: true)!;
        var format = owner.GetMethod("FormatUnderscoreName", BindingFlags.Public | BindingFlags.Static)!;
        _format = format.CreateDelegate<Func<string, bool, bool, string>>();
        var resolve = owner.GetMethod("ResolveBodyDescriptor", BindingFlags.Public | BindingFlags.Static)!;
        var body = Expression.Parameter(typeof(string));
        var service = Expression.Parameter(typeof(Type));
        var method = Expression.Parameter(typeof(MethodDescriptor));
        _resolve = Expression.Lambda<Func<string, Type, MethodDescriptor, object?>>(
            Expression.Convert(Expression.Call(resolve, body, service, method), typeof(object)), body, service, method).Compile();
        var proto = new FileDescriptorProto
        {
            Name = "autoperf_name_fixture.proto",
            Package = "autoperf",
            Syntax = "proto3",
            Dependency = { HttpRule.Descriptor.File.Name },
            Service =
            {
                new ServiceDescriptorProto
                {
                    Name = "Fixture",
                    Method =
                    {
                        new MethodDescriptorProto
                        {
                            Name = nameof(FixtureService.Select),
                            InputType = "." + HttpRule.Descriptor.FullName,
                            OutputType = "." + HttpRule.Descriptor.FullName
                        }
                    }
                }
            }
        };
        var file = FileDescriptor.FromGeneratedCode(proto.ToByteArray(), [HttpRule.Descriptor.File],
            new GeneratedClrTypeInfo(Array.Empty<Type>(), Array.Empty<GeneratedClrTypeInfo>()));
        _method = file.Services.Single().Methods.Single();
        _request = new HttpRule { Custom = new CustomHttpPattern { Kind = "POST", Path = "/sentinel" } };
        _request.AdditionalBindings.Add(new HttpRule { Selector = "sentinel" });
        var receipt = Verify(Execute());
        if (Verify(Execute()) != receipt)
        {
            throw new InvalidOperationException("Actual formatter/descriptor results changed.");
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            Case,
            _scenario.Kind,
            InputLength = _scenario.Input.Length,
            _scenario.Pascal,
            _scenario.Periods,
            ActualOwner = owner.FullName,
            ActualField = _scenario.Kind is Operation.Body ? _method.InputType.FindFieldByName(_scenario.Input).FullName : null,
            Receipt = receipt
        }));
    }

    [Benchmark]
    public object? Execute()
    {
        if (_scenario.Kind is Operation.Format)
        {
            return _format(_scenario.Input, _scenario.Pascal, _scenario.Periods);
        }
        if (_scenario.Kind is Operation.Echo)
        {
            return _scenario.Input;
        }
        if (_scenario.Kind is Operation.Missing)
        {
            try
            {
                return _resolve(_scenario.Input, typeof(FixtureService), _method);
            }
            catch (InvalidOperationException exception)
            {
                return exception.Message;
            }
        }
        return _resolve(_scenario.Input, typeof(FixtureService), _method);
    }

    private string Verify(object? value)
    {
        if (_scenario.Kind is Operation.Format or Operation.Echo or Operation.Missing)
        {
            if (value is not string text || text != _scenario.Expected)
            {
                throw new InvalidOperationException($"Actual output mismatch: {Case}.");
            }
            return $"OutputLength={text.Length};ExpectedExact=true";
        }
        if (value is null)
        {
            throw new InvalidOperationException("Actual complete body descriptor missing.");
        }
        var type = value.GetType();
        if (_scenario.Kind is Operation.Star)
        {
            var parameter = (ParameterInfo?)type.GetProperty(nameof(ParameterInfo))!.GetValue(value);
            if (parameter?.Name != _scenario.Expected)
            {
                throw new InvalidOperationException("Actual full-body parameter descriptor mismatch.");
            }
            return $"ActualParameter={parameter.Name};FormatterNotReached=true";
        }
        var property = (PropertyInfo?)type.GetProperty(nameof(PropertyInfo))!.GetValue(value);
        var field = (FieldDescriptor?)type.GetProperty(nameof(FieldDescriptor))!.GetValue(value);
        if (property?.Name != _scenario.Expected || field?.Name != _scenario.Input ||
            !ReferenceEquals(field.Accessor.GetValue(_request), property.GetValue(_request)))
        {
            throw new InvalidOperationException("Actual generated field/property/value identity mismatch.");
        }
        return $"Field={field.FullName};Property={property.Name};ValueIdentity=true";
    }

    private static Scenario Letters(string name, int length) =>
        new(name, new string('a', length), "A" + new string('a', length - 1));

    private sealed record Scenario(string Name, string Input, string Expected,
        bool Pascal = true, bool Periods = false, Operation Kind = Operation.Format);

    private enum Operation
    {
        Format,
        Body,
        Star,
        Missing,
        Echo
    }

    private sealed class FixtureService
    {
        public void Select(HttpRule request)
        {
        }
    }
}
