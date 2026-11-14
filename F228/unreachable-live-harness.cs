using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Google.Protobuf;
using Google.Protobuf.Reflection;
using Microsoft.AspNetCore.Routing.Patterns;

[MemoryDiagnoser]
public class QueryMembershipBenchmark
{
    private static readonly Scenario[] Scenarios =
    [
        new("Dormant_8_0", 8, 0),
        new("Dormant_8_1", 8, 1),
        new("Dormant_8_4", 8, 4),
        new("Dormant_8_8", 8, 8),
        new("Dormant_64_0", 64, 0),
        new("Dormant_64_1", 64, 1),
        new("Dormant_64_32", 64, 32),
        new("Dormant_64_64", 64, 64),
        new("Dormant_256_0", 256, 0),
        new("Dormant_256_32", 256, 32),
        new("Dormant_256_128", 256, 128),
        new("Dormant_256_256", 256, 256),
        new("Dormant_1024_128", 1024, 128),
        new("Dormant_1024_512", 1024, 512),
        new("Wildcard_256_128", 256, 128, Wildcard: true),
        new("LiveParseRoute_256_128", 256, 128, Live: true)
    ];

    public static IEnumerable<string> Cases => Scenarios.Select(scenario => scenario.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private Scenario _scenario = null!;
    private MethodDescriptor _method = null!;
    private object _routes = null!;
    private string _pattern = null!;
    private Func<object, MethodDescriptor, MessageDescriptor?, object?, Dictionary<string, FieldDescriptor>> _query = null!;
    private Func<string, string, string, MethodDescriptor, object> _parseRoute = null!;

    [GlobalSetup]
    public void Setup()
    {
        _scenario = Scenarios.Single(scenario => scenario.Name == Case);
        var request = new DescriptorProto { Name = "Request" };
        for (var i = 0; i < _scenario.Fields; i++)
        {
            request.Field.Add(new FieldDescriptorProto
            {
                Name = "f" + i.ToString("D4", System.Globalization.CultureInfo.InvariantCulture),
                JsonName = "q" + i.ToString("D4", System.Globalization.CultureInfo.InvariantCulture),
                Number = i + 1,
                Label = FieldDescriptorProto.Types.Label.Optional,
                Type = FieldDescriptorProto.Types.Type.String
            });
        }
        var proto = new FileDescriptorProto
        {
            Name = "query_fixture.proto",
            Package = "autoperf",
            Syntax = "proto3",
            MessageType = { request },
            Service =
            {
                new ServiceDescriptorProto
                {
                    Name = "Fixture",
                    Method =
                    {
                        new MethodDescriptorProto
                        {
                            Name = nameof(FixtureService.Query),
                            InputType = ".autoperf.Request",
                            OutputType = ".autoperf.Request"
                        }
                    }
                }
            }
        };
        _method = FileDescriptor.BuildFromByteStrings([proto.ToByteString()]).Single().Services.Single().Methods.Single();
        _pattern = "/v1" + string.Concat(_method.InputType.Fields.InFieldNumberOrder().Take(_scenario.Excluded).Select(field => "/{" + field.Name + "}"));
        var assembly = Assembly.Load("Microsoft.AspNetCore.Grpc.JsonTranscoding");
        var owner = assembly.GetType("Grpc.Shared.ServiceDescriptorHelpers", throwOnError: true)!;
        var routePattern = assembly.GetType("Grpc.Shared.HttpRoutePattern", throwOnError: true)!;
        var parsed = routePattern.GetMethod("Parse")!.Invoke(null, [_pattern])!;
        var variables = routePattern.GetProperty("Variables")!.GetValue(parsed)!;
        _routes = owner.GetMethod("ResolveRouteParameterDescriptors")!.Invoke(null, [variables, _method.InputType])!;
        var query = owner.GetMethod("ResolveQueryParameterDescriptors")!;
        var routes = Expression.Parameter(typeof(object));
        var method = Expression.Parameter(typeof(MethodDescriptor));
        var body = Expression.Parameter(typeof(MessageDescriptor));
        var fieldParameter = Expression.Parameter(typeof(object));
        _query = Expression.Lambda<Func<object, MethodDescriptor, MessageDescriptor?, object?, Dictionary<string, FieldDescriptor>>>(
            Expression.Call(query, Expression.Convert(routes, query.GetParameters()[0].ParameterType), method, body,
                Expression.Convert(fieldParameter, typeof(FieldDescriptor))), routes, method, body, fieldParameter).Compile();
        var binder = assembly.GetType("Microsoft.AspNetCore.Grpc.JsonTranscoding.Internal.Binding.JsonTranscodingProviderServiceBinder`1", throwOnError: true)!
            .MakeGenericType(typeof(FixtureService));
        var parseRoute = binder.GetMethod("ParseRoute", BindingFlags.NonPublic | BindingFlags.Static)!;
        var pattern = Expression.Parameter(typeof(string));
        var bodyText = Expression.Parameter(typeof(string));
        var responseText = Expression.Parameter(typeof(string));
        _parseRoute = Expression.Lambda<Func<string, string, string, MethodDescriptor, object>>(
            Expression.Convert(Expression.Call(parseRoute, pattern, bodyText, responseText, method), typeof(object)),
            pattern, bodyText, responseText, method).Compile();
        var receipt = Verify(Execute());
        if (Verify(Execute()) != receipt)
        {
            throw new InvalidOperationException("Actual route/query descriptors changed between setups.");
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            Case,
            _scenario.Fields,
            _scenario.Excluded,
            _scenario.Wildcard,
            _scenario.Live,
            Method = _method.FullName,
            Receipt = receipt
        }));
    }

    [Benchmark]
    public object Execute()
    {
        if (_scenario.Live)
        {
            return _parseRoute(_pattern, string.Empty, string.Empty, _method);
        }
        return _query(_routes, _method, _scenario.Wildcard ? _method.InputType : null, null);
    }

    private string Verify(object result)
    {
        if (_scenario.Live)
        {
            var type = result.GetType();
            var pattern = (RoutePattern)type.GetField("Item1")!.GetValue(result)!;
            var info = type.GetField("Item2")!.GetValue(result)!;
            var infoType = info.GetType();
            var routes = (System.Collections.IDictionary)infoType.GetProperty("RouteParameterDescriptors")!.GetValue(info)!;
            var cache = infoType.GetProperty("PathDescriptorsCache")!.GetValue(info)!;
            var count = (int)cache.GetType().GetProperty("Count")!.GetValue(cache)!;
            var routeFields = _method.InputType.Fields.InFieldNumberOrder().Take(_scenario.Excluded).ToArray();
            if (pattern.Parameters.Count != _scenario.Excluded || routes.Count != _scenario.Excluded || count != 0 ||
                infoType.GetProperty("BodyDescriptor")!.GetValue(info) is not null ||
                !pattern.Parameters.Select(parameter => parameter.Name).SequenceEqual(routeFields.Select(field => field.Name)) ||
                !routes.Keys.Cast<string>().SequenceEqual(routeFields.Select(field => field.Name)))
            {
                throw new InvalidOperationException("Actual live binder metadata producer mismatch.");
            }
            foreach (var field in routeFields)
            {
                var route = routes[field.Name]!;
                var path = (IEnumerable<FieldDescriptor>)route.GetType().GetProperty("DescriptorsPath")!.GetValue(route)!;
                if (!ReferenceEquals(path.Single(), field))
                {
                    throw new InvalidOperationException("Actual live route field identity mismatch.");
                }
            }
            return $"ActualParseRoute=true;RouteFields={routes.Count};OrderedNames=true;FieldIdentity=true;PathCache={count};NoBody=true";
        }
        if (result is not Dictionary<string, FieldDescriptor> values)
        {
            throw new InvalidOperationException("Actual dormant query dictionary missing.");
        }
        var expected = _scenario.Wildcard
            ? Array.Empty<FieldDescriptor>()
            : _method.InputType.Fields.InFieldNumberOrder().Skip(_scenario.Excluded).ToArray();
        if (values.Count != expected.Length || !values.Keys.SequenceEqual(expected.Select(field => field.JsonName)) ||
            !values.Values.Zip(expected).All(pair => ReferenceEquals(pair.First, pair.Second)))
        {
            throw new InvalidOperationException("Exact query order/JSON name/field identity mismatch.");
        }
        return $"DormantHelper=true;Count={values.Count};OrderedJsonNames=true;FieldIdentity=true";
    }

    private sealed record Scenario(string Name, int Fields, int Excluded, bool Wildcard = false, bool Live = false);

    private sealed class FixtureService
    {
        public void Query()
        {
        }
    }
}
