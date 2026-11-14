using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Owin;

[MemoryDiagnoser]
public class CancellationDefaultBenchmark
{
    private const string CancellationKey = "owin.CallCancelled";
    private const string VersionKey = "owin.Version";
    private static readonly Scenario[] Scenarios =
    [
        new("Fresh_Absent"),
        new("Fresh_None", Present: true),
        new("Fresh_Cancelled", Present: true, Kind: ValueKind.Cancelled),
        new("Fresh_Null", Present: true, Kind: ValueKind.Null),
        new("Fresh_Object", Present: true, Kind: ValueKind.Object),
        new("Dictionary_Absent", Dictionary: true),
        new("Dictionary_None", Dictionary: true, Present: true),
        new("LifetimeFeature_Absent", Lifetime: true),
        new("Reused_Default", Reused: true),
        new("Reused_Dictionary32", Dictionary: true, Reused: true, Padding: 32),
        new("Reused_Dictionary1024", Dictionary: true, Reused: true, Padding: 1024),
        new("RequestOnly_Control", RequestOnly: true)
    ];

    public static IEnumerable<string> Cases => Scenarios.Select(scenario => scenario.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private Scenario _scenario = null!;
    private CancellationTokenSource _cancellation = null!;
    private object? _existing;
    private DefaultHttpContext? _reused;
    private object? _reusedCancellation;
    private int _reusedCount;

    [GlobalSetup]
    public void Setup()
    {
        _scenario = Scenarios.Single(scenario => scenario.Name == Case);
        _cancellation = new CancellationTokenSource();
        _cancellation.Cancel();
        _existing = _scenario.Kind switch
        {
            ValueKind.None => CancellationToken.None,
            ValueKind.Cancelled => _cancellation.Token,
            ValueKind.Null => null,
            ValueKind.Object => new object(),
            _ => throw new InvalidOperationException("Unknown fixture value.")
        };
        if (_scenario.Reused)
        {
            _reused = CreateContext();
            _ = new OwinEnvironment(_reused);
            _reusedCancellation = _reused.Items[CancellationKey];
            _reusedCount = _reused.Items.Count;
        }
        var first = Construct();
        var receipt = Verify(first);
        var second = Construct();
        if (Verify(second) != receipt || ReferenceEquals(first, second))
        {
            throw new InvalidOperationException("Complete constructor/producer results changed or result was cached.");
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            Case,
            ActualOwner = typeof(OwinEnvironment).FullName,
            IncludesRealContextAndItemsProducer = !_scenario.Reused,
            ExistingKeyAtConstructor = _scenario.Present || _scenario.Reused,
            _scenario.Lifetime,
            _scenario.RequestOnly,
            _scenario.Padding,
            _scenario.Reused,
            Receipt = receipt
        }));
    }

    [Benchmark]
    public object Construct()
    {
        var context = _reused ?? CreateContext();
        return _scenario.RequestOnly ? context : new OwinEnvironment(context);
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _cancellation.Dispose();
    }

    private DefaultHttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        if (_scenario.Dictionary)
        {
            context.Items = new Dictionary<object, object?>();
        }
        for (var index = 0; index < _scenario.Padding; index++)
        {
            context.Items[index] = _existing;
        }
        if (_scenario.Present)
        {
            context.Items[CancellationKey] = _existing;
        }
        if (_scenario.Lifetime)
        {
            context.RequestAborted = _cancellation.Token;
        }
        return context;
    }

    private string Verify(object result)
    {
        if (_scenario.RequestOnly)
        {
            var context = result as DefaultHttpContext
                ?? throw new InvalidOperationException("Request-only producer did not return the actual context.");
            if (context.Items.Count != 0)
            {
                throw new InvalidOperationException("Control accidentally constructed OWIN defaults.");
            }
            return "actual DefaultHttpContext; no OWIN defaults";
        }
        var environment = result as IDictionary<string, object>
            ?? throw new InvalidOperationException("Actual complete OWIN environment was not returned.");
        var ownerContext = environment[typeof(HttpContext).FullName!] as DefaultHttpContext
            ?? throw new InvalidOperationException("Actual stored context identity missing.");
        if (_scenario.Reused && !ReferenceEquals(ownerContext, _reused))
        {
            throw new InvalidOperationException("Reused-context identity changed.");
        }
        if (!ownerContext.Items.TryGetValue(CancellationKey, out var stored) ||
            !environment.TryGetValue(CancellationKey, out var exposed) ||
            !Equals(environment[VersionKey], "1.0") ||
            ownerContext.Items.Count != _scenario.Padding + 3)
        {
            throw new InvalidOperationException($"Actual default/value/version/count mismatch: {Case}.");
        }
        if (_scenario.Present)
        {
            if (!ReferenceEquals(stored, _existing))
            {
                throw new InvalidOperationException("Existing item object identity was replaced.");
            }
        }
        else if (stored is not CancellationToken storedToken || storedToken != CancellationToken.None)
        {
            throw new InvalidOperationException("Actual missing-token default changed.");
        }
        if (_scenario.Reused && (!ReferenceEquals(stored, _reusedCancellation) || ownerContext.Items.Count != _reusedCount))
        {
            throw new InvalidOperationException("Reused constructor replaced existing token or grew Items.");
        }
        if (_scenario.Lifetime)
        {
            if (exposed is not CancellationToken exposedToken || exposedToken != _cancellation.Token || !exposedToken.IsCancellationRequested)
            {
                throw new InvalidOperationException("Actual lifetime feature did not take precedence.");
            }
        }
        else if (!ReferenceEquals(exposed, stored))
        {
            throw new InvalidOperationException("Environment did not expose exact stored fallback.");
        }
        return $"ItemsType={ownerContext.Items.GetType().FullName};Count={ownerContext.Items.Count};" +
            $"Value={_scenario.Kind};Existing={_scenario.Present || _scenario.Reused};Lifetime={_scenario.Lifetime};Version=1.0";
    }

    private sealed record Scenario(string Name, bool Dictionary = false, bool Present = false,
        ValueKind Kind = ValueKind.None, bool Lifetime = false, bool Reused = false, int Padding = 0, bool RequestOnly = false);
    private enum ValueKind
    {
        None,
        Cancelled,
        Null,
        Object
    }
}
