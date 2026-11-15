using System.Collections;
using System.Reflection;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace AutoPerf;

[MemoryDiagnoser]
public class ObjectCollectionBenchmark
{
    private HeaderWorkload _workload = null!;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = Corpus.Cases[0];

    public IEnumerable<string> Cases => Corpus.Cases;

    [GlobalSetup]
    public void Setup()
    {
        OwnerProbe.Verify();
        _workload = new(Case);
        var contract = Contracts.VerifyTwice(_workload);
        Contracts.VerifyOriginal(contract);
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(contract));
    }

    [Benchmark]
    public object? Run() => _workload.Run();
}

internal static class Corpus
{
    public static readonly string[] Cases =
    [
        "Live_Cache_NoCache_Add_2", "Live_Cache_Private_Add_2", "Live_Cache_Parse_NoCache_Private",
        "Live_Cache_Extensions_Add_2", "Live_ContentDisposition_Parameters_Add_2",
        "Live_MediaType_Parameters_Add_2", "Live_MediaType_Copy_2", "Live_MediaType_CopyReadOnly_2",
        "Live_Range_Add_2", "Helper_Default_Int", "Helper_Default_StringSegment",
        "Helper_Default_NullableInt_Null", "Helper_Default_NullableInt_Value",
        "Helper_Default_Reference_Null", "Helper_Default_Reference_Value",
        "Helper_Default_StringSegment_Empty", "Diagnostic_Collection_Int_Set",
        "Diagnostic_Collection_StringSegment_Set", "Live_Cache_NoCache_InvalidDefault",
        "Live_Cache_Private_InvalidSpace", "Diagnostic_ReadOnly_StringSegment_Add",
        "Live_MediaType_ReadOnlyParameters_Add"
    ];

    public static readonly string[] ResourceCases =
    [
        "Helper_Default_Int", "Helper_Default_StringSegment", "Helper_Default_NullableInt_Value",
        "Helper_Default_Reference_Value", "Helper_Default_StringSegment_Empty",
        "Diagnostic_Collection_Int_Set", "Diagnostic_Collection_StringSegment_Set", "Live_Cache_NoCache_Add_2"
    ];
}

internal sealed record CollectionFact(string Property, string ElementType, string RuntimeType,
    string Validator, bool IsReadOnly, string[] Values, bool[] SameOriginalElements);

internal sealed record WorkloadContract(string Case, string Scope, string ResultType, string Protocol,
    string? ExceptionType, string? ExceptionParameter, string? ExceptionMessage, string HelperValidator,
    bool HeaderIsReadOnly, CollectionFact[] Collections);

internal sealed class HeaderWorkload
{
    private readonly string _case;
    private readonly Func<object?> _operation;
    private readonly Type? _expectedException;
    private readonly Action<int> _intValidator = OwnerProbe.Default<int>();
    private readonly Action<int?> _nullableValidator = OwnerProbe.Default<int?>();
    private readonly Action<StringSegment> _segmentValidator = OwnerProbe.Default<StringSegment>();
    private readonly Action<NameValueHeaderValue> _referenceValidator = OwnerProbe.Default<NameValueHeaderValue>();
    private readonly NameValueHeaderValue _a = new("a", "1");
    private readonly NameValueHeaderValue _b = new("b", "2");
    private readonly RangeItemHeaderValue _rangeA = new(0, 5);
    private readonly RangeItemHeaderValue _rangeB = new(10, 15);
    private readonly StringSegment _tokenA = new("x-a");
    private readonly StringSegment _tokenB = new("x-b");
    private readonly IList<int> _integers = OwnerProbe.Create<int>();
    private readonly IList<StringSegment> _segments = OwnerProbe.Create<StringSegment>();
    private readonly IList<StringSegment> _readOnlySegments = OwnerProbe.ReadOnly<StringSegment>();
    private readonly MediaTypeHeaderValue _media = new("application/example");
    private readonly MediaTypeHeaderValue _readOnlyMedia;
    private object? _lastHeader;

    public HeaderWorkload(string name)
    {
        _case = name;
        _integers.Add(0);
        _segments.Add(_tokenA);
        _media.Parameters.Add(_a);
        _media.Parameters.Add(_b);
        _readOnlyMedia = _media.CopyAsReadOnly();
        _expectedException = name switch
        {
            "Helper_Default_NullableInt_Null" or "Helper_Default_Reference_Null" => typeof(ArgumentNullException),
            "Live_Cache_NoCache_InvalidDefault" => typeof(ArgumentException),
            "Live_Cache_Private_InvalidSpace" => typeof(FormatException),
            "Diagnostic_ReadOnly_StringSegment_Add" or "Live_MediaType_ReadOnlyParameters_Add" => typeof(NotSupportedException),
            _ => null
        };
        _operation = name switch
        {
            "Live_Cache_NoCache_Add_2" => () =>
            {
                var header = new CacheControlHeaderValue { NoCache = true };
                _lastHeader = header;
                header.NoCacheHeaders.Add(_tokenA);
                header.NoCacheHeaders.Add(_tokenB);
                return header;
            },
            "Live_Cache_Private_Add_2" => () =>
            {
                var header = new CacheControlHeaderValue { Private = true };
                _lastHeader = header;
                header.PrivateHeaders.Add(_tokenA);
                header.PrivateHeaders.Add(_tokenB);
                return header;
            },
            "Live_Cache_Parse_NoCache_Private" => () =>
            {
                var header = CacheControlHeaderValue.Parse("no-cache=\"x-a, x-b\", private=\"x-c\"");
                _lastHeader = header;
                return header;
            },
            "Live_Cache_Extensions_Add_2" => () =>
            {
                var header = new CacheControlHeaderValue();
                _lastHeader = header;
                header.Extensions.Add(_a);
                header.Extensions.Add(_b);
                return header;
            },
            "Live_ContentDisposition_Parameters_Add_2" => () =>
            {
                var header = new ContentDispositionHeaderValue("attachment");
                _lastHeader = header;
                header.Parameters.Add(_a);
                header.Parameters.Add(_b);
                return header;
            },
            "Live_MediaType_Parameters_Add_2" => () =>
            {
                var header = new MediaTypeHeaderValue("application/example");
                _lastHeader = header;
                header.Parameters.Add(_a);
                header.Parameters.Add(_b);
                return header;
            },
            "Live_MediaType_Copy_2" => () => _lastHeader = _media.Copy(),
            "Live_MediaType_CopyReadOnly_2" => () => _lastHeader = _media.CopyAsReadOnly(),
            "Live_Range_Add_2" => () =>
            {
                var header = new RangeHeaderValue();
                _lastHeader = header;
                header.Ranges.Add(_rangeA);
                header.Ranges.Add(_rangeB);
                return header;
            },
            "Helper_Default_Int" => () => { _intValidator(0); return null; },
            "Helper_Default_StringSegment" => () => { _segmentValidator(_tokenA); return null; },
            "Helper_Default_NullableInt_Null" => () => { _nullableValidator(null); return null; },
            "Helper_Default_NullableInt_Value" => () => { _nullableValidator(0); return null; },
            "Helper_Default_Reference_Null" => () => { _referenceValidator(null!); return null; },
            "Helper_Default_Reference_Value" => () => { _referenceValidator(_a); return null; },
            "Helper_Default_StringSegment_Empty" => () => { _segmentValidator(default); return null; },
            "Diagnostic_Collection_Int_Set" => () => { _integers[0] = 1; return _integers; },
            "Diagnostic_Collection_StringSegment_Set" => () => { _segments[0] = _tokenB; return _segments; },
            "Live_Cache_NoCache_InvalidDefault" => () =>
            {
                var header = new CacheControlHeaderValue { NoCache = true };
                _lastHeader = header;
                header.NoCacheHeaders.Add(default);
                return header;
            },
            "Live_Cache_Private_InvalidSpace" => () =>
            {
                var header = new CacheControlHeaderValue { Private = true };
                _lastHeader = header;
                header.PrivateHeaders.Add("x y");
                return header;
            },
            "Diagnostic_ReadOnly_StringSegment_Add" => () => { _readOnlySegments.Add(_tokenA); return _readOnlySegments; },
            "Live_MediaType_ReadOnlyParameters_Add" => () =>
            {
                _lastHeader = _readOnlyMedia;
                _readOnlyMedia.Parameters.Add(_a);
                return _readOnlyMedia;
            },
            _ => throw new ArgumentException("Unknown fixed case.", nameof(name))
        };
    }

    public object? Run()
    {
        _lastHeader = null;
        try
        {
            return _operation();
        }
        catch (Exception error) when (error.GetType() == _expectedException)
        {
            return error;
        }
    }

    public WorkloadContract Capture()
    {
        var result = Run();
        var error = result as Exception;
        if (error?.GetType() != _expectedException)
        {
            throw new InvalidOperationException("Expected exact owning exception/result differs: " + _case);
        }
        var protocol = _lastHeader?.ToString() ?? "<none>";
        var expectedProtocol = _case switch
        {
            "Live_Cache_NoCache_Add_2" => "no-cache=\"x-a, x-b\"",
            "Live_Cache_Private_Add_2" => "private=\"x-a, x-b\"",
            "Live_Cache_Parse_NoCache_Private" => "no-cache=\"x-a, x-b\", private=\"x-c\"",
            "Live_Cache_Extensions_Add_2" => "a=1, b=2",
            "Live_ContentDisposition_Parameters_Add_2" => "attachment; a=1; b=2",
            "Live_MediaType_Parameters_Add_2" or "Live_MediaType_Copy_2" or
                "Live_MediaType_CopyReadOnly_2" or "Live_MediaType_ReadOnlyParameters_Add" => "application/example; a=1; b=2",
            "Live_Range_Add_2" => "bytes=0-5, 10-15",
            "Live_Cache_NoCache_InvalidDefault" => "no-cache",
            "Live_Cache_Private_InvalidSpace" => "private",
            _ => "<none>"
        };
        if (protocol != expectedProtocol)
        {
            throw new InvalidOperationException("Actual public protocol differs: " + _case);
        }
        var collections = ObserveCollections();
        foreach (var collection in collections)
        {
            if (collection.ElementType == typeof(StringSegment).FullName && _case.StartsWith("Live_", StringComparison.Ordinal) &&
                collection.Validator != typeof(CacheControlHeaderValue).FullName + ".CheckIsValidToken")
            {
                throw new InvalidOperationException("Real value-type producer reached a different validator.");
            }
        }
        if (_case.StartsWith("Live_MediaType_Copy", StringComparison.Ordinal) &&
            (collections.Length != 1 || collections[0].SameOriginalElements.Any(same => same)))
        {
            throw new InvalidOperationException("Real deep-copy element identity differs.");
        }
        var helper = _case switch
        {
            "Helper_Default_Int" => OwnerProbe.ValidatorName(_intValidator),
            "Helper_Default_NullableInt_Null" or "Helper_Default_NullableInt_Value" => OwnerProbe.ValidatorName(_nullableValidator),
            "Helper_Default_Reference_Null" or "Helper_Default_Reference_Value" => OwnerProbe.ValidatorName(_referenceValidator),
            "Helper_Default_StringSegment" or "Helper_Default_StringSegment_Empty" => OwnerProbe.ValidatorName(_segmentValidator),
            _ => "<none>"
        };

        return new(_case, _case.StartsWith("Live_", StringComparison.Ordinal) ? "Real public header producer/control" :
            _case.StartsWith("Helper_", StringComparison.Ordinal) ? "Helper-only owning delegate;not producer evidence" :
            "Internally constructed value-type collection;no located shipped producer",
            result?.GetType().FullName ?? "<null>", protocol, error?.GetType().FullName,
            (error as ArgumentException)?.ParamName, error?.Message, helper,
            _lastHeader is MediaTypeHeaderValue media && media.IsReadOnly, collections);
    }

    private CollectionFact[] ObserveCollections()
    {
        return _case switch
        {
            "Live_Cache_NoCache_Add_2" or "Live_Cache_NoCache_InvalidDefault" =>
                [Observe("NoCacheHeaders", ((CacheControlHeaderValue)_lastHeader!).NoCacheHeaders)],
            "Live_Cache_Private_Add_2" or "Live_Cache_Private_InvalidSpace" =>
                [Observe("PrivateHeaders", ((CacheControlHeaderValue)_lastHeader!).PrivateHeaders)],
            "Live_Cache_Parse_NoCache_Private" =>
                [Observe("NoCacheHeaders", ((CacheControlHeaderValue)_lastHeader!).NoCacheHeaders),
                 Observe("PrivateHeaders", ((CacheControlHeaderValue)_lastHeader!).PrivateHeaders)],
            "Live_Cache_Extensions_Add_2" =>
                [Observe("Extensions", ((CacheControlHeaderValue)_lastHeader!).Extensions)],
            "Live_ContentDisposition_Parameters_Add_2" =>
                [Observe("Parameters", ((ContentDispositionHeaderValue)_lastHeader!).Parameters)],
            "Live_MediaType_Parameters_Add_2" or "Live_MediaType_Copy_2" or "Live_MediaType_CopyReadOnly_2" or
                "Live_MediaType_ReadOnlyParameters_Add" => [Observe("Parameters", ((MediaTypeHeaderValue)_lastHeader!).Parameters)],
            "Live_Range_Add_2" => [Observe("Ranges", ((RangeHeaderValue)_lastHeader!).Ranges)],
            "Diagnostic_Collection_Int_Set" => [Observe("Diagnostic", _integers)],
            "Diagnostic_Collection_StringSegment_Set" => [Observe("Diagnostic", _segments)],
            "Diagnostic_ReadOnly_StringSegment_Add" => [Observe("Diagnostic", _readOnlySegments)],
            _ => []
        };
    }

    private CollectionFact Observe<T>(string property, ICollection<T> collection)
    {
        var validator = OwnerProbe.CollectionValidator(collection);
        var values = collection.Select(item => item?.ToString() ?? "<null>").ToArray();
        var same = collection.Select(item => ReferenceEquals(item, _a) || ReferenceEquals(item, _b) ||
            ReferenceEquals(item, _rangeA) || ReferenceEquals(item, _rangeB)).ToArray();

        return new(property, typeof(T).FullName!, collection.GetType().FullName!, OwnerProbe.ValidatorName(validator),
            collection.IsReadOnly, values, same);
    }
}

internal static class OwnerProbe
{
    public static readonly Assembly Assembly = typeof(CacheControlHeaderValue).Assembly;
    private static readonly Type Collection = Assembly.GetType("Microsoft.Net.Http.Headers.ObjectCollection`1")
        ?? throw new InvalidOperationException("Actual internal header collection absent.");

    public static Action<T> Default<T>() => (Action<T>)(Collection.MakeGenericType(typeof(T))
        .GetField("DefaultValidator", BindingFlags.Static | BindingFlags.NonPublic)?.GetValue(null)
        ?? throw new InvalidOperationException("Actual default delegate missing."));

    public static IList<T> Create<T>() => (IList<T>)(Activator.CreateInstance(Collection.MakeGenericType(typeof(T)))
        ?? throw new InvalidOperationException("Actual default collection not created."));

    public static IList<T> ReadOnly<T>() => (IList<T>)(Collection.MakeGenericType(typeof(T))
        .GetField("EmptyReadOnlyCollection", BindingFlags.Static | BindingFlags.NonPublic)?.GetValue(null)
        ?? throw new InvalidOperationException("Actual read-only collection absent."));

    public static Delegate CollectionValidator(object collection) => (Delegate)(collection.GetType()
        .GetField("_validator", BindingFlags.Instance | BindingFlags.NonPublic)?.GetValue(collection)
        ?? throw new InvalidOperationException("Real collection validator absent."));

    public static string ValidatorName(Delegate validator) => validator.Method.DeclaringType!.FullName + "." + validator.Method.Name;

    public static void Verify()
    {
        var expected = Path.Combine(AppContext.BaseDirectory, "Microsoft.Net.Http.Headers.dll");
        if (!Path.GetFullPath(Assembly.Location).Equals(Path.GetFullPath(expected), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Framework/shared owner loaded instead of frozen local owner.");
        }
        var method = Collection.MakeGenericType(typeof(int)).GetMethod("CheckNotNull", BindingFlags.Static | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("Actual default check absent.");
        Console.WriteLine("AUTOPERF_OWNER " + JsonSerializer.Serialize(new
        {
            Assembly.Location, Mvid = Assembly.ManifestModule.ModuleVersionId,
            IntMethodIL = Convert.ToHexString(method.GetMethodBody()!.GetILAsByteArray()!)
        }));
    }
}

internal static class Contracts
{
    public static WorkloadContract VerifyTwice(HeaderWorkload workload)
    {
        var first = workload.Capture();
        var second = workload.Capture();
        if (JsonSerializer.Serialize(first) != JsonSerializer.Serialize(second))
        {
            throw new InvalidOperationException("Complete original repeated workload differs.");
        }

        return first;
    }

    public static void VerifyOriginal(WorkloadContract contract)
    {
        var all = JsonSerializer.Deserialize<WorkloadContract[]>(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "contract-oracles.json")))
            ?? throw new InvalidOperationException("Original oracle corpus absent.");
        var expected = all.Single(row => row.Case == contract.Case);
        if (JsonSerializer.Serialize(expected) != JsonSerializer.Serialize(contract))
        {
            throw new InvalidOperationException("Actual owner/protocol/validator/error/identity contract differs from original.");
        }
    }
}
