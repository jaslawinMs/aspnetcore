using System.Collections;
using System.Globalization;
using System.Reflection;
using System.Reflection.Emit;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson;

namespace AutoPerf;

internal sealed class JsonPatchFixture
{
    public static readonly string[] Cases =
    [
        "IntReplace1", "IntReplace8", "StringReplace1", "StringReplace8",
        "DerivedReplace8", "MultiListReplace8", "IntConverted8",
        "MixedReplace8", "MixedReplace32",
        "Depth4", "Depth16", "Depth64", "Depth128", "Depth64Eight",
        "JsonArray1", "JsonArray8", "JsonArrayDepth16",
        "IntAddRemove", "IntTest8", "IntMoveRoundTrip", "IntCopyRemove",
        "ArrayRejected", "NonGenericRejected", "IntBadIndex", "IntBadValue", "PocoControl",
    ];

    private readonly object _target;
    private readonly JsonPatchDocument _document;
    private readonly string _expectedState;
    private readonly string? _expectedError;
    private readonly Action<JsonPatchError> _onError;
    private string? _lastError;
    private long _errors;

    public JsonPatchFixture(string name)
    {
        Name = name;
        (_target, _document, _expectedState, _expectedError) = name switch
        {
            "IntReplace1" => Replace(new List<int> { 10, 20, 30 }, 42, 1, "[10,42,30]"),
            "IntReplace8" => Replace(new List<int> { 10, 20, 30 }, 42, 8, "[10,42,30]"),
            "StringReplace1" => Replace(new List<string> { "10", "20", "30" }, "new", 1, "[\"10\",\"new\",\"30\"]"),
            "StringReplace8" => Replace(new List<string> { "10", "20", "30" }, "new", 8, "[\"10\",\"new\",\"30\"]"),
            "DerivedReplace8" => Replace(new DerivedIntList { 10, 20, 30 }, 42, 8, "[10,42,30]"),
            "MultiListReplace8" => Replace(new MultipleInterfaceList { 10, 20, 30 }, 42, 8, "[10,42,30]"),
            "IntConverted8" => Converted(),
            "MixedReplace8" => Mixed(2),
            "MixedReplace32" => Mixed(8),
            "Depth4" => Deep(4, 1, jsonArray: false),
            "Depth16" => Deep(16, 1, jsonArray: false),
            "Depth64" => Deep(64, 1, jsonArray: false),
            "Depth128" => Deep(128, 1, jsonArray: false),
            "Depth64Eight" => Deep(64, 8, jsonArray: false),
            "JsonArray1" => Replace(new JsonArray { 10, 20, 30 }, 42, 1, "[10,42,30]"),
            "JsonArray8" => Replace(new JsonArray { 10, 20, 30 }, 42, 8, "[10,42,30]"),
            "JsonArrayDepth16" => Deep(16, 1, jsonArray: true),
            "IntAddRemove" => Balanced("add"),
            "IntTest8" => Balanced("test"),
            "IntMoveRoundTrip" => Balanced("move"),
            "IntCopyRemove" => Balanced("copy"),
            "ArrayRejected" => Rejected(new[] { 10, 20, 30 }, "1", 42,
                "The type 'System.Int32[]' which is an array is not supported for json patch operations as it has a fixed size."),
            "NonGenericRejected" => Rejected(new ArrayList { 10, 20, 30 }, "1", 42,
                "The type 'System.Collections.ArrayList' which is a non generic list is not supported for json patch operations. Only generic list types are supported."),
            "IntBadIndex" => Rejected(new List<int> { 10, 20, 30 }, "9", 42,
                "The index value provided by path segment '9' is out of bounds of the array size."),
            "IntBadValue" => Rejected(new List<int> { 10, 20, 30 }, "1", "James",
                "The value 'James' is invalid for target location."),
            "PocoControl" => (new PocoTarget { Value = 20 }, new JsonPatchDocument().Replace("/" + nameof(PocoTarget.Value), 42), "{\"Value\":42}", null),
            _ => throw new ArgumentOutOfRangeException(nameof(name), name, "Unknown real JSON Patch profile."),
        };
        _onError = error =>
        {
            _errors++;
            _lastError = error.ErrorMessage;
        };
    }

    public string Name { get; }

    public object Apply()
    {
        if (_expectedError is null)
        {
            _document.ApplyTo(_target);
        }
        else
        {
            _document.ApplyTo(_target, _onError);
        }

        return _target;
    }

    public JsonPatchContract Capture()
    {
        for (var repeat = 0; repeat < 2; repeat++)
        {
            var previousErrors = _errors;
            Apply();
            if (State(_target) != _expectedState || _lastError != _expectedError ||
                _errors - previousErrors != (_expectedError is null ? 0 : 1))
            {
                throw new InvalidOperationException($"Actual ApplyTo mutation/error contract failed: {Name}.");
            }
        }

        return new JsonPatchContract(Name, State(_target), _document.Operations.Count,
            _expectedError is null ? 0 : 1, _lastError, _target.GetType().FullName!);
    }

    private static (object, JsonPatchDocument, string, string?) Replace(object target, object value, int operations, string expected)
    {
        var document = new JsonPatchDocument();
        for (var i = 0; i < operations; i++)
        {
            document.Replace("/1", value);
        }

        return (target, document, expected, null);
    }

    private static (object, JsonPatchDocument, string, string?) Converted()
    {
        var (target, document, expected, error) = Replace(new List<int> { 10, 20, 30 }, "42", 8, "[10,42,30]");
        document.SerializerOptions = new JsonSerializerOptions { NumberHandling = JsonNumberHandling.AllowReadingFromString };

        return (target, document, expected, error);
    }

    private static (object, JsonPatchDocument, string, string?) Mixed(int repeats)
    {
        var guid = Guid.Parse("11111111-2222-3333-4444-555555555555");
        var target = new List<object>
        {
            new List<int> { 10 }, new List<string> { "old" },
            new List<long> { 10 }, new List<Guid> { Guid.Empty },
        };
        var document = new JsonPatchDocument();
        for (var i = 0; i < repeats; i++)
        {
            document.Replace("/0/0", 42).Replace("/1/0", "new").Replace("/2/0", 42L).Replace("/3/0", guid);
        }

        return (target, document, "[[42],[\"new\"],[42],[\"11111111-2222-3333-4444-555555555555\"]]", null);
    }

    private static (object, JsonPatchDocument, string, string?) Deep(int depth, int operations, bool jsonArray)
    {
        object target = jsonArray ? new JsonArray { 10, 20, 30 } : new List<int> { 10, 20, 30 };
        var expected = "[10,42,30]";
        for (var i = 1; i < depth; i++)
        {
            target = jsonArray ? new JsonArray((JsonNode)target) : new List<object> { target };
            expected = "[" + expected + "]";
        }
        var document = new JsonPatchDocument();
        var path = string.Concat(Enumerable.Repeat("/0", depth - 1)) + "/1";
        for (var i = 0; i < operations; i++)
        {
            document.Replace(path, 42);
        }

        return (target, document, expected, null);
    }

    private static (object, JsonPatchDocument, string, string?) Balanced(string operation)
    {
        var document = new JsonPatchDocument();
        for (var i = 0; i < 8; i++)
        {
            switch (operation)
            {
                case "add":
                    document.Add("/-", 42).Remove("/-");
                    break;
                case "test":
                    document.Test("/1", 20);
                    break;
                case "move":
                    document.Move("/0", "/2").Move("/2", "/0");
                    break;
                case "copy":
                    document.Copy("/0", "/-").Remove("/-");
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(operation));
            }
        }

        return (new List<int> { 10, 20, 30 }, document, "[10,20,30]", null);
    }

    private static (object, JsonPatchDocument, string, string?) Rejected(object target, string position, object value, string error)
    {
        return (target, new JsonPatchDocument().Replace("/" + position, value), "[10,20,30]", error);
    }

    private static string State(object target)
    {
        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream))
        {
            WriteValue(writer, target);
        }

        return Encoding.UTF8.GetString(stream.ToArray());
    }

    private static void WriteValue(Utf8JsonWriter writer, object? value)
    {
        switch (value)
        {
            case null:
                writer.WriteNullValue();
                break;
            case JsonNode node:
                node.WriteTo(writer);
                break;
            case IList list:
                writer.WriteStartArray();
                foreach (var item in list)
                {
                    WriteValue(writer, item);
                }
                writer.WriteEndArray();
                break;
            case int number:
                writer.WriteNumberValue(number);
                break;
            case long number:
                writer.WriteNumberValue(number);
                break;
            case string text:
                writer.WriteStringValue(text);
                break;
            case Guid guid:
                writer.WriteStringValue(guid);
                break;
            case PocoTarget poco:
                writer.WriteStartObject();
                writer.WriteNumber(nameof(PocoTarget.Value), poco.Value);
                writer.WriteEndObject();
                break;
            default:
                throw new InvalidOperationException($"Unaccounted actual list value: {value.GetType()}.");
        }
    }

    private sealed class PocoTarget
    {
        public int Value { get; set; }
    }

    private sealed class DerivedIntList : List<int>
    {
    }

    private sealed class MultipleInterfaceList : List<int>, IList<string>
    {
        private readonly List<string> _strings = [];
        string IList<string>.this[int index]
        {
            get => _strings[index];
            set => _strings[index] = value;
        }
        int ICollection<string>.Count => _strings.Count;
        bool ICollection<string>.IsReadOnly => false;
        void ICollection<string>.Add(string item) => _strings.Add(item);
        void ICollection<string>.Clear() => _strings.Clear();
        bool ICollection<string>.Contains(string item) => _strings.Contains(item);
        void ICollection<string>.CopyTo(string[] array, int arrayIndex) => _strings.CopyTo(array, arrayIndex);
        bool ICollection<string>.Remove(string item) => _strings.Remove(item);
        int IList<string>.IndexOf(string item) => _strings.IndexOf(item);
        void IList<string>.Insert(int index, string item) => _strings.Insert(index, item);
        void IList<string>.RemoveAt(int index) => _strings.RemoveAt(index);
        IEnumerator<string> IEnumerable<string>.GetEnumerator() => _strings.GetEnumerator();
    }
}

internal sealed record JsonPatchContract(string Name, string State, int OperationsPerApply,
    int ErrorsPerApply, string? ErrorMessage, string RootType);

internal sealed class JsonPatchColdFixture
{
    public const int BatchSize = 64;
    public static readonly string[] Cases = ["FreshList64", "FreshElement64"];
    private readonly IList[] _targets = new IList[BatchSize];
    private readonly JsonPatchDocument[] _documents = new JsonPatchDocument[BatchSize];
    private readonly object[] _expected = new object[BatchSize];
    private readonly bool _collectibleElements;

    public JsonPatchColdFixture(string name)
    {
        Name = name;
        _collectibleElements = name switch
        {
            "FreshList64" => false,
            "FreshElement64" => true,
            _ => throw new ArgumentOutOfRangeException(nameof(name)),
        };
        var generation = Guid.NewGuid().ToString("N");
        var assembly = AssemblyBuilder.DefineDynamicAssembly(new AssemblyName("ColdLists" + generation), AssemblyBuilderAccess.RunAndCollect);
        var module = assembly.DefineDynamicModule("Lists");
        for (var i = 0; i < BatchSize; i++)
        {
            var elementType = typeof(int);
            if (_collectibleElements)
            {
                var element = module.DefineType("AutoPerf.ColdElement" + i.ToString(CultureInfo.InvariantCulture), TypeAttributes.Public);
                element.DefineDefaultConstructor(MethodAttributes.Public);
                elementType = element.CreateType()!;
            }
            var listBuilder = module.DefineType("AutoPerf.ColdList" + i.ToString(CultureInfo.InvariantCulture),
                TypeAttributes.Public, typeof(List<>).MakeGenericType(elementType));
            listBuilder.DefineDefaultConstructor(MethodAttributes.Public);
            var type = listBuilder.CreateType()!;
            _targets[i] = (IList)Activator.CreateInstance(type)!;
            _targets[i].Add(_collectibleElements ? Activator.CreateInstance(elementType)! : 20);
            _expected[i] = _collectibleElements ? Activator.CreateInstance(elementType)! : 42;
            _documents[i] = new JsonPatchDocument().Replace("/0", _expected[i]);
        }
        if (_targets.Select(target => target.GetType()).Distinct().Count() != BatchSize ||
            _targets.Any(target => !target.GetType().Assembly.IsCollectible))
        {
            throw new InvalidOperationException("Cold fixture did not produce64 distinct collectible runtime list types.");
        }
        Console.WriteLine($"AUTOPERF_COLD_BATCH={Name}|{generation}|{BatchSize}");
    }

    public string Name { get; }

    public object ApplyBatch()
    {
        for (var i = 0; i < BatchSize; i++)
        {
            _documents[i].ApplyTo(_targets[i]);
        }

        return _targets[^1];
    }

    public JsonPatchColdContract Capture()
    {
        ApplyBatch();
        for (var i = 0; i < BatchSize; i++)
        {
            var actual = _targets[i][0];
            if (_targets[i].Count != 1 ||
                (_collectibleElements ? !ReferenceEquals(actual, _expected[i]) : !Equals(actual, 42)))
            {
                throw new InvalidOperationException($"Actual cold ApplyTo mutation/reference contract failed: {Name}/{i}.");
            }
        }

        return new JsonPatchColdContract(Name, BatchSize, BatchSize, _collectibleElements,
            "All64 first-use targets replaced exactly once;scalar42 or exact expected collectible element reference.");
    }
}

internal sealed record JsonPatchColdContract(string Name, int DistinctCollectibleListTypes,
    int SuccessfulFirstUseMutations, bool CollectibleElementTypes, string State);
