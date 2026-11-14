using System.Globalization;
using System.Reflection;
using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Google.Protobuf;
using Google.Protobuf.Reflection;
using Google.Protobuf.WellKnownTypes;
using Microsoft.AspNetCore.Grpc.JsonTranscoding;
using CustomListValue = Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.TestObjects.CustomWellKnown.ListValue;
using CustomValue = Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.TestObjects.CustomWellKnown.Value;

[MemoryDiagnoser]
public class ListValueActivationBenchmark
{
    private const string Mixed = "[null,true,1.5,\"text\",{\"a\":[false]},[2]]";
    private static readonly Scenario[] Scenarios =
    [
        new("Root_Empty_String", Mode.List, Shape.Empty),
        new("Root_Single_String", Mode.List, Shape.Single),
        new("Root_Mixed_String", Mode.List, Shape.Mixed),
        new("Root_32_String", Mode.List, Shape.Numbers, 32),
        new("Root_256_String", Mode.List, Shape.Numbers, 256),
        new("Root_1024_String", Mode.List, Shape.Numbers, 1024),
        new("Root_Empty_Utf8", Mode.ListUtf8, Shape.Empty),
        new("Root_Mixed_Utf8", Mode.ListUtf8, Shape.Mixed),
        new("Root_256_Utf8", Mode.ListUtf8, Shape.Numbers, 256),
        new("Root_NestedEmpty_8", Mode.List, Shape.NestedEmpty, 8),
        new("Root_NestedEmpty_64", Mode.List, Shape.NestedEmpty, 64),
        new("Root_NestedEmpty_256", Mode.List, Shape.NestedEmpty, 256),
        new("Value_Nested_64", Mode.Value, Shape.NestedEmpty, 64),
        new("Struct_Nested_64", Mode.Struct, Shape.NestedEmpty, 64),
        new("Custom_Empty", Mode.Custom, Shape.Empty),
        new("Custom_Mixed", Mode.Custom, Shape.Mixed),
        new("Custom_Nested_8", Mode.Custom, Shape.NestedEmpty, 8),
        new("Null_List_Control", Mode.List, Shape.Null),
        new("Value_Scalar_Control", Mode.Value, Shape.Single),
        new("Struct_Flat_Control", Mode.Struct, Shape.Single),
        new("Write_List_Control", Mode.Write, Shape.Mixed)
    ];

    public static IEnumerable<string> Cases => Scenarios.Select(scenario => scenario.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private Scenario _scenario = null!;
    private string _json = string.Empty;
    private byte[] _bytes = [];
    private JsonSerializerOptions _options = null!;
    private IMessage? _expected;
    private ListValue _writeMessage = null!;

    [GlobalSetup]
    public void Setup()
    {
        _scenario = Scenarios.Single(scenario => scenario.Name == Case);
        _json = _scenario.Shape switch
        {
            Shape.Empty => "[]",
            Shape.Mixed => Mixed,
            Shape.Null => "null",
            Shape.Numbers => "[" + string.Join(",", Enumerable.Range(0, _scenario.Count)
                .Select(value => value.ToString(CultureInfo.InvariantCulture))) + "]",
            Shape.NestedEmpty => "[" + string.Join(",", Enumerable.Repeat("[]", _scenario.Count)) + "]",
            Shape.Single => _scenario.Mode switch
            {
                Mode.Struct => "{\"enabled\":true,\"count\":1}",
                Mode.Value => "true",
                _ => "[true]"
            },
            _ => throw new InvalidOperationException("Unknown fixture shape.")
        };
        if (_scenario.Mode is Mode.Struct && _scenario.Shape is Shape.NestedEmpty)
        {
            _json = "{\"items\":" + _json + "}";
        }
        _bytes = Encoding.UTF8.GetBytes(_json);
        _writeMessage = JsonParser.Default.Parse<ListValue>(Mixed);
        var assembly = Assembly.Load("Microsoft.AspNetCore.Grpc.JsonTranscoding");
        var registryType = assembly.GetType("Grpc.Shared.DescriptorRegistry", throwOnError: true)!;
        var registry = Activator.CreateInstance(registryType)!;
        var register = registryType.GetMethod("RegisterFileDescriptor")!;
        register.Invoke(registry, [ListValue.Descriptor.File]);
        register.Invoke(registry, [CustomListValue.Descriptor.File]);
        var contextType = assembly.GetType("Microsoft.AspNetCore.Grpc.JsonTranscoding.Internal.Json.JsonContext", throwOnError: true)!;
        var context = Activator.CreateInstance(contextType, [new GrpcJsonSettings(), TypeRegistry.Empty, registry])!;
        var helper = assembly.GetType("Microsoft.AspNetCore.Grpc.JsonTranscoding.Internal.Json.JsonConverterHelper", throwOnError: true)!;
        _options = (JsonSerializerOptions)helper.GetMethod("CreateSerializerOptions", BindingFlags.NonPublic | BindingFlags.Static)!
            .Invoke(null, [context, false])!;
        _expected = _scenario.Shape is Shape.Null ? null : _scenario.Mode switch
        {
            Mode.Custom => CustomListValue.Parser.ParseFrom(JsonParser.Default.Parse<ListValue>(_json).ToByteString()),
            Mode.Value => JsonParser.Default.Parse<Value>(_json),
            Mode.Struct => JsonParser.Default.Parse<Struct>(_json),
            Mode.Write => _writeMessage,
            _ => JsonParser.Default.Parse<ListValue>(_json)
        };
        var type = _scenario.Mode switch
        {
            Mode.Custom => typeof(CustomListValue),
            Mode.Value => typeof(Value),
            Mode.Struct => typeof(Struct),
            _ => typeof(ListValue)
        };
        var converter = _options.GetConverter(type);
        var first = Execute();
        var second = Execute();
        Verify(first);
        Verify(second);
        if (first is IMessage && ReferenceEquals(first, second))
        {
            throw new InvalidOperationException("Deserialization reused the previous mutable message.");
        }
        if (first is ListValue standard)
        {
            standard.Values.Add(Value.ForString("changed"));
            Verify(second);
        }
        if (first is CustomListValue custom)
        {
            custom.Values.Add(new CustomValue { StringValue = "changed" });
            Verify(second);
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            Case,
            Mode = _scenario.Mode.ToString(),
            _scenario.Count,
            PayloadBytes = _bytes.Length,
            Converter = converter.GetType().FullName,
            Message = type.FullName,
            ProtobufOutputBytes = _expected?.CalculateSize(),
            CompleteProtobufEquality = true,
            FreshMessage = first is IMessage,
            FreshRootCollection = first is ListValue or CustomListValue,
            StandardListRead = (_scenario.Mode is Mode.List or Mode.ListUtf8 && _scenario.Shape is not Shape.Null) ||
                (_scenario.Shape is Shape.NestedEmpty && _scenario.Mode is Mode.Value or Mode.Struct),
            CustomClrFallback = _scenario.Mode is Mode.Custom,
            WriteOrNullControl = _scenario.Mode is Mode.Write || _scenario.Shape is Shape.Null
        }));
    }

    [Benchmark]
    public object? Execute()
    {
        return _scenario.Mode switch
        {
            Mode.List => JsonSerializer.Deserialize<ListValue>(_json, _options),
            Mode.ListUtf8 => JsonSerializer.Deserialize<ListValue>(_bytes, _options),
            Mode.Value => JsonSerializer.Deserialize<Value>(_json, _options),
            Mode.Struct => JsonSerializer.Deserialize<Struct>(_json, _options),
            Mode.Custom => JsonSerializer.Deserialize<CustomListValue>(_json, _options),
            Mode.Write => JsonSerializer.Serialize(_writeMessage, _options),
            _ => throw new InvalidOperationException("Unknown serializer fixture.")
        };
    }

    private void Verify(object? result)
    {
        if (_scenario.Mode is Mode.Write)
        {
            if (result is not string json || !JsonParser.Default.Parse<ListValue>(json).Equals(_writeMessage))
            {
                throw new InvalidOperationException("Actual ListValue write contract changed.");
            }
            return;
        }
        if (_expected is null)
        {
            if (result is not null)
            {
                throw new InvalidOperationException("Root-null serializer preemption changed.");
            }
            return;
        }
        if (result is not IMessage message || message.GetType() != _expected.GetType() || !message.Equals(_expected))
        {
            throw new InvalidOperationException("Actual complete protobuf values/order/CLR type differ from independent JSON parser.");
        }
    }

    private sealed record Scenario(string Name, Mode Mode, Shape Shape, int Count = 0);
    private enum Mode
    {
        List, ListUtf8, Value, Struct, Custom, Write
    }

    private enum Shape
    {
        Empty, Single, Mixed, Numbers, NestedEmpty, Null
    }
}
