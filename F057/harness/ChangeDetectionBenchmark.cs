using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.RenderTree;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

[MemoryDiagnoser]
public class ChangeDetectionBenchmark
{
    private IWorkload _workload = null!;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = Corpus.Cases[0];

    public IEnumerable<string> Cases => Corpus.Cases;

    [GlobalSetup]
    public void Setup()
    {
        OwnerProbe.Verify();
        _workload = Corpus.Create(Case);
        var contract = Contracts.VerifyTwice(_workload);
        Contracts.VerifyOriginal(contract);
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(contract, Contracts.Options));
    }

    [Benchmark]
    public int Run() => _workload.Run();

    [GlobalCleanup]
    public void Cleanup() => _workload.Dispose();
}

internal static class Corpus
{
    public static readonly string[] Cases =
    [
        "Helper_Int_Equal", "Helper_Int_Different", "Helper_Long_Equal", "Helper_Bool_Equal",
        "Helper_Guid_Equal", "Helper_DateOnly_Equal", "Helper_TimeOnly_Equal", "Helper_Enum_Equal",
        "Helper_NullableInt_BothNull", "Helper_NullableInt_NullToZero", "Helper_NullableInt_ZeroToNull",
        "Helper_NullableInt_EqualZero", "Helper_String_BothNull", "Helper_String_Equal",
        "Helper_String_Different", "Helper_MutableReference_Same", "Helper_WideStruct_Equal",
        "Helper_Int_Object_Equal", "ParameterView_Int_Equal", "ParameterView_Int_Different",
        "ParameterView_NullableInt_BothNull", "ParameterView_NullableInt_ZeroToNull",
        "ParameterView_Guid_Equal", "ParameterView_String_Equal", "ParameterView_MutableReference_Same",
        "ParameterView_NameChanged", "Cascade_Int_Equal", "Cascade_Int_Different",
        "Cascade_NullableInt_BothNull", "Cascade_NullableInt_NullToZero", "Cascade_Guid_Equal",
        "Cascade_String_Equal", "Cascade_String_Different", "Cascade_MutableReference_Same",
        "Cascade_WideStruct_Equal", "Cascade_Enum_Equal", "Cascade_NullableInt_EqualZero",
        "Cascade_NullableInt_ZeroToNull"
    ];

    private static readonly Guid GuidValue = new("01234567-89ab-cdef-0123-456789abcdef");
    private static readonly MutableValue ReferenceValue = new(7);

    public static IWorkload Create(string name) => name switch
    {
        "Helper_Int_Equal" => new HelperWorkload<int, int>(name, 0, 0, false),
        "Helper_Int_Different" => new HelperWorkload<int, int>(name, 0, 1, true),
        "Helper_Long_Equal" => new HelperWorkload<long, long>(name, 42, 42, false),
        "Helper_Bool_Equal" => new HelperWorkload<bool, bool>(name, false, false, false),
        "Helper_Guid_Equal" => new HelperWorkload<Guid, Guid>(name, GuidValue, GuidValue, false),
        "Helper_DateOnly_Equal" => new HelperWorkload<DateOnly, DateOnly>(name, new(2026, 11, 15), new(2026, 11, 15), false),
        "Helper_TimeOnly_Equal" => new HelperWorkload<TimeOnly, TimeOnly>(name, new(12, 34, 56), new(12, 34, 56), false),
        "Helper_Enum_Equal" => new HelperWorkload<DayOfWeek, DayOfWeek>(name, DayOfWeek.Monday, DayOfWeek.Monday, false),
        "Helper_NullableInt_BothNull" => new HelperWorkload<int?, int?>(name, null, null, false),
        "Helper_NullableInt_NullToZero" => new HelperWorkload<int?, int?>(name, null, 0, true),
        "Helper_NullableInt_ZeroToNull" => new HelperWorkload<int?, int?>(name, 0, null, true),
        "Helper_NullableInt_EqualZero" => new HelperWorkload<int?, int?>(name, 0, 0, false),
        "Helper_String_BothNull" => new HelperWorkload<string?, string?>(name, null, null, false),
        "Helper_String_Equal" => new HelperWorkload<string, string>(name, "same", "same", false),
        "Helper_String_Different" => new HelperWorkload<string, string>(name, "first", "second", true),
        "Helper_MutableReference_Same" => new HelperWorkload<MutableValue, MutableValue>(name, ReferenceValue, ReferenceValue, true),
        "Helper_WideStruct_Equal" => new HelperWorkload<WideValue, WideValue>(name, new(7), new(7), true),
        "Helper_Int_Object_Equal" => new HelperWorkload<int, object>(name, 0, 0, false),
        "ParameterView_Int_Equal" => new ParameterWorkload(name, 0, 0, true),
        "ParameterView_Int_Different" => new ParameterWorkload(name, 0, 1, false),
        "ParameterView_NullableInt_BothNull" => new ParameterWorkload(name, (int?)null, (int?)null, true),
        "ParameterView_NullableInt_ZeroToNull" => new ParameterWorkload(name, (int?)0, (int?)null, false),
        "ParameterView_Guid_Equal" => new ParameterWorkload(name, GuidValue, GuidValue, true),
        "ParameterView_String_Equal" => new ParameterWorkload(name, "same", "same", true),
        "ParameterView_MutableReference_Same" => new ParameterWorkload(name, ReferenceValue, ReferenceValue, false),
        "ParameterView_NameChanged" => new ParameterWorkload(name, 0, 0, false, "Other"),
        "Cascade_Int_Equal" => new CascadeWorkload<int>(name, 0, 0, false),
        "Cascade_Int_Different" => new CascadeWorkload<int>(name, 0, 1, true),
        "Cascade_NullableInt_BothNull" => new CascadeWorkload<int?>(name, null, null, false),
        "Cascade_NullableInt_NullToZero" => new CascadeWorkload<int?>(name, null, 0, true),
        "Cascade_Guid_Equal" => new CascadeWorkload<Guid>(name, GuidValue, GuidValue, false),
        "Cascade_String_Equal" => new CascadeWorkload<string>(name, "same", "same", false),
        "Cascade_String_Different" => new CascadeWorkload<string>(name, "first", "second", true),
        "Cascade_MutableReference_Same" => new CascadeWorkload<MutableValue>(name, ReferenceValue, ReferenceValue, true),
        "Cascade_WideStruct_Equal" => new CascadeWorkload<WideValue>(name, new(7), new(7), true),
        "Cascade_Enum_Equal" => new CascadeWorkload<DayOfWeek>(name, DayOfWeek.Monday, DayOfWeek.Monday, false),
        "Cascade_NullableInt_EqualZero" => new CascadeWorkload<int?>(name, 0, 0, false),
        "Cascade_NullableInt_ZeroToNull" => new CascadeWorkload<int?>(name, 0, null, true),
        _ => throw new ArgumentException("Unknown fixed workload.", nameof(name))
    };
}

internal interface IWorkload : IDisposable
{
    int Run();
    WorkloadContract Capture();
}

internal sealed record WorkloadContract(
    string Case, string Boundary, string FirstDeclaredType, string SecondDeclaredType,
    string FirstValue, string SecondValue, bool SameOriginalReference, int ActualResult,
    int ActualSubscribers, long DisplayBatches, long UpdatedComponents, bool LatestValuePreserved);

internal sealed class HelperWorkload<T1, T2>(string name, T1 first, T2 second, bool expectedChanged) : IWorkload
{
    private readonly Func<T1, T2, bool> _compare =
        OwnerProbe.Method.MakeGenericMethod(typeof(T1), typeof(T2)).CreateDelegate<Func<T1, T2, bool>>();

    public int Run() => _compare(first, second) ? 1 : 0;

    public WorkloadContract Capture()
    {
        var result = Run();
        if (result != (expectedChanged ? 1 : 0))
        {
            throw new InvalidOperationException("Owning helper contract changed: " + name);
        }

        return new(name, "Actual owning helper;not renderer-producer proof", typeof(T1).ToString(), typeof(T2).ToString(),
            Contracts.Value(first), Contracts.Value(second), ReferenceEquals(first, second), result, 0, 0, 0, true);
    }

    public void Dispose()
    {
    }
}

internal sealed class ParameterWorkload : IWorkload
{
    private delegate bool ParameterComparer(ref ParameterView current, ParameterView previous);
    private readonly ParameterComparer _compare;
    private readonly string _name;
    private readonly object? _firstValue;
    private readonly object? _secondValue;
    private readonly bool _expectedEqual;
    private ParameterView _first;
    private ParameterView _second;

    public ParameterWorkload(string name, object? first, object? second, bool expectedEqual, string secondName = "Value")
    {
        _name = name;
        _firstValue = first;
        _secondValue = second;
        _expectedEqual = expectedEqual;
        _first = ParameterView.FromDictionary(new Dictionary<string, object?> { ["Value"] = first });
        _second = ParameterView.FromDictionary(new Dictionary<string, object?> { [secondName] = second });
        _compare = (typeof(ParameterView).GetMethod("DefinitelyEquals", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("Actual ParameterView comparer missing.")).CreateDelegate<ParameterComparer>();
    }

    public int Run() => _compare(ref _second, _first) ? 1 : 0;

    public WorkloadContract Capture()
    {
        var result = Run();
        if (result != (_expectedEqual ? 1 : 0))
        {
            throw new InvalidOperationException("Actual object-valued ParameterView contract changed: " + _name);
        }

        return new(_name, "Actual ParameterView.FromDictionary/DefinitelyEquals", typeof(object).ToString(), typeof(object).ToString(),
            Contracts.Value(_firstValue), Contracts.Value(_secondValue), ReferenceEquals(_firstValue, _secondValue), result, 0, 0, 0, true);
    }

    public void Dispose()
    {
    }
}

internal sealed class CascadeWorkload<T> : IWorkload
{
    private readonly string _name;
    private readonly T _firstValue;
    private readonly T _secondValue;
    private readonly bool _expectedChanged;
    private readonly ServiceProvider _services;
    private readonly BoundedRenderer _renderer;
    private readonly RootProducer<T> _parent;
    private readonly int _root;
    private readonly ParameterView _first;
    private readonly ParameterView _second;
    private readonly Action _pair;

    public CascadeWorkload(string name, T first, T second, bool expectedChanged)
    {
        _name = name;
        _firstValue = first;
        _secondValue = second;
        _expectedChanged = expectedChanged;
        _services = new ServiceCollection().BuildServiceProvider();
        _renderer = new(_services);
        _parent = new();
        _root = _renderer.AddRoot(_parent);
        _first = ParameterView.FromDictionary(new Dictionary<string, object?> { [nameof(RootProducer<T>.Value)] = first });
        _second = ParameterView.FromDictionary(new Dictionary<string, object?> { [nameof(RootProducer<T>.Value)] = second });
        _renderer.Dispatcher.InvokeAsync(() => _renderer.Render(_root, _first)).GetAwaiter().GetResult();
        if (_parent.Consumer.ParameterSets != 1 || ActualSubscriberCount() != 1 || !LatestValueMatches())
        {
            throw new InvalidOperationException("Real renderer did not create the original bound consumer/subscription.");
        }
        _pair = () =>
        {
            _renderer.Render(_root, _second);
            _renderer.Render(_root, _first);
        };
    }

    public int Run()
    {
        var before = _parent.Consumer.ParameterSets;
        _renderer.Dispatcher.InvokeAsync(_pair).GetAwaiter().GetResult();

        return _parent.Consumer.ParameterSets - before;
    }

    public WorkloadContract Capture()
    {
        var batches = _renderer.DisplayBatches;
        var updates = _renderer.UpdatedComponents;
        var result = Run();
        var subscribers = ActualSubscriberCount();
        var valuePreserved = LatestValueMatches();
        if (result != (_expectedChanged ? 2 : 0) || subscribers != 1 || !valuePreserved ||
            _renderer.DisplayBatches - batches != 2 || _renderer.UpdatedComponents - updates != (_expectedChanged ? 6 : 4))
        {
            throw new InvalidOperationException("Actual cascading subscriber/render-batch contract changed: " + _name);
        }

        return new(_name, "Actual Renderer/CascadingValue<T>/live consumer", typeof(T).ToString(), typeof(T).ToString(),
            Contracts.Value(_firstValue), Contracts.Value(_secondValue), ReferenceEquals(_firstValue, _secondValue),
            result, subscribers, _renderer.DisplayBatches - batches, _renderer.UpdatedComponents - updates, valuePreserved);
    }

    private int ActualSubscriberCount()
    {
        var subscribers = (typeof(CascadingValue<T>).GetField("_subscribers", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("Actual subscription field missing.")).GetValue(_parent.Supplier)
            ?? throw new InvalidOperationException("Actual renderer created no subscription.");
        var count = subscribers.GetType().GetProperty("Count") ?? throw new InvalidOperationException("Subscriber count missing.");

        return (int)(count.GetValue(subscribers) ?? throw new InvalidOperationException("Subscriber count was null."));
    }

    private bool LatestValueMatches() => typeof(T).IsValueType
        ? EqualityComparer<T>.Default.Equals(_firstValue, _parent.Consumer.Value!)
        : ReferenceEquals(_firstValue, _parent.Consumer.Value);

    public void Dispose()
    {
        _renderer.Dispose();
        _services.Dispose();
    }
}

internal sealed class BoundedRenderer(IServiceProvider services) : Renderer(services, NullLoggerFactory.Instance)
{
    public override Dispatcher Dispatcher { get; } = Dispatcher.CreateDefault();
    public long DisplayBatches { get; private set; }
    public long UpdatedComponents { get; private set; }

    public int AddRoot(IComponent component) => AssignRootComponentId(component);

    public void Render(int componentId, ParameterView parameters)
    {
        var task = RenderRootComponentAsync(componentId, parameters);
        if (!task.IsCompleted)
        {
            throw new InvalidOperationException("Unexpected asynchronous producer in the fixed synchronous workload.");
        }
        task.GetAwaiter().GetResult();
    }

    protected override void HandleException(Exception exception) => ExceptionDispatchInfo.Capture(exception).Throw();

    protected override Task UpdateDisplayAsync(in RenderBatch batch)
    {
        DisplayBatches++;
        UpdatedComponents += batch.UpdatedComponents.Count;

        return Task.CompletedTask;
    }
}

public sealed class RootProducer<T> : ComponentBase
{
    private readonly RenderFragment _children;
    private readonly Action<object> _captureConsumer;
    private readonly Action<object> _captureSupplier;
    private Consumer<T>? _consumer;
    private CascadingValue<T>? _supplier;

    public RootProducer()
    {
        _captureConsumer = value => _consumer = (Consumer<T>)value;
        _captureSupplier = value => _supplier = (CascadingValue<T>)value;
        _children = builder =>
        {
            builder.OpenComponent<Consumer<T>>(0);
            builder.AddComponentReferenceCapture(1, _captureConsumer);
            builder.CloseComponent();
        };
    }

    [Parameter]
    public T? Value { get; set; }

    public Consumer<T> Consumer => _consumer ?? throw new InvalidOperationException("Consumer not produced.");
    public CascadingValue<T> Supplier => _supplier ?? throw new InvalidOperationException("Supplier not produced.");

    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        builder.OpenComponent<CascadingValue<T>>(0);
        builder.AddComponentParameter(1, nameof(CascadingValue<T>.Value), Value);
        builder.AddComponentParameter(2, nameof(CascadingValue<T>.ChildContent), _children);
        builder.AddComponentParameter(3, nameof(CascadingValue<T>.IsFixed), false);
        builder.AddComponentReferenceCapture(4, _captureSupplier);
        builder.CloseComponent();
    }
}

public sealed class Consumer<T> : ComponentBase
{
    [CascadingParameter]
    public T? Value { get; set; }

    public int ParameterSets { get; private set; }

    protected override void OnParametersSet() => ParameterSets++;
}

public sealed class MutableValue(int number)
{
    public int Number { get; } = number;
}

public readonly struct WideValue(long value)
{
    public readonly long A = value;
    public readonly long B = value + 1;
    public readonly long C = value + 2;
    public readonly long D = value + 3;
    public readonly long E = value + 4;
    public readonly long F = value + 5;
    public readonly long G = value + 6;
    public readonly long H = value + 7;
    public readonly long I = value + 8;
    public readonly long J = value + 9;
    public readonly long K = value + 10;
    public readonly long L = value + 11;
    public readonly long M = value + 12;
    public readonly long N = value + 13;
    public readonly long O = value + 14;
    public readonly long P = value + 15;
}

internal static class OwnerProbe
{
    public static readonly Assembly Assembly = typeof(ParameterView).Assembly;
    public static readonly MethodInfo Method = (Assembly.GetType("Microsoft.AspNetCore.Components.ChangeDetection", true)
        ?? throw new InvalidOperationException("Source owner type missing.")).GetMethod("MayHaveChanged", BindingFlags.Public | BindingFlags.Static)
        ?? throw new InvalidOperationException("Source owner method missing.");

    public static void Verify()
    {
        var expected = Path.Combine(AppContext.BaseDirectory, "Microsoft.AspNetCore.Components.dll");
        if (!Path.GetFullPath(Assembly.Location).Equals(Path.GetFullPath(expected), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("A stale installed/shared-framework owner was loaded.");
        }
    }
}

internal static class Contracts
{
    public static readonly JsonSerializerOptions Options = new() { IncludeFields = true };

    public static string Value<T>(T value) => JsonSerializer.Serialize(new
    {
        DeclaredType = typeof(T).ToString(),
        RuntimeType = value is null ? "<null>" : value.GetType().ToString(),
        Data = value
    }, Options);

    public static WorkloadContract VerifyTwice(IWorkload workload)
    {
        var first = workload.Capture();
        var second = workload.Capture();
        if (JsonSerializer.Serialize(first, Options) != JsonSerializer.Serialize(second, Options))
        {
            throw new InvalidOperationException("Repeated actual workload contracts differ.");
        }

        return first;
    }

    public static void VerifyOriginal(WorkloadContract actual)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "contract-oracles.json");
        var originals = JsonSerializer.Deserialize<WorkloadContract[]>(File.ReadAllText(path), Options)
            ?? throw new InvalidOperationException("Original contract array missing.");
        var original = originals.Single(item => item.Case == actual.Case);
        if (JsonSerializer.Serialize(original, Options) != JsonSerializer.Serialize(actual, Options))
        {
            throw new InvalidOperationException("Material result/producer contract differs from original: " + actual.Case);
        }
    }
}
