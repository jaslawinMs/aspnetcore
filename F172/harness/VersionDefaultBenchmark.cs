using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Owin;

[MemoryDiagnoser]
public class VersionDefaultBenchmark
{
    private const string VersionKey = "owin.Version";
    private const string CancellationKey = "owin.CallCancelled";
    private static readonly Scenario[] Scenarios =
    [
        new("Fresh_Absent"),
        new("Fresh_Custom", Present: true),
        new("Fresh_Empty", Present: true, Kind: ValueKind.Empty),
        new("Fresh_Null", Present: true, Kind: ValueKind.Null),
        new("Fresh_Object", Present: true, Kind: ValueKind.Object),
        new("Fresh_Default", Present: true, Kind: ValueKind.Default),
        new("Dictionary_Absent", Dictionary: true),
        new("Dictionary_Custom", Dictionary: true, Present: true),
        new("Reused_Default", Reused: true),
        new("Reused_Dictionary32", Dictionary: true, Reused: true, Padding: 32),
        new("Reused_Dictionary1024", Dictionary: true, Reused: true, Padding: 1024),
        new("RequestOnly_Control", RequestOnly: true)
    ];

    public static IEnumerable<string> Cases => Scenarios.Select(scenario => scenario.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private Scenario _scenario = null!;
    private object? _existing;
    private DefaultHttpContext? _reused;
    private object? _reusedVersion;
    private object? _reusedCancellation;

    [GlobalSetup]
    public void Setup()
    {
        _scenario = Scenarios.Single(scenario => scenario.Name == Case);
        _existing = _scenario.Kind switch
        {
            ValueKind.Custom => "9.0",
            ValueKind.Empty => string.Empty,
            ValueKind.Null => null,
            ValueKind.Object => new object(),
            ValueKind.Default => "1.0",
            _ => throw new InvalidOperationException("Unknown fixture value.")
        };
        if (_scenario.Reused)
        {
            _reused = CreateContext();
            _ = new OwinEnvironment(_reused);
            _reusedVersion = _reused.Items[VersionKey];
            _reusedCancellation = _reused.Items[CancellationKey];
        }
        var first = Construct();
        var receipt = Verify(first);
        var second = Construct();
        if (Verify(second) != receipt || ReferenceEquals(first, second))
        {
            throw new InvalidOperationException("Complete producer results changed or result was cached.");
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            Case,
            ActualOwner = typeof(OwinEnvironment).FullName,
            IncludesRealContextAndItemsProducer = !_scenario.Reused,
            ExistingVersionAtConstructor = _scenario.Present || _scenario.Reused,
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
            context.Items[VersionKey] = _existing;
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
            ?? throw new InvalidOperationException("Actual complete environment was not returned.");
        var ownerContext = environment[typeof(HttpContext).FullName!] as DefaultHttpContext
            ?? throw new InvalidOperationException("Actual context identity missing.");
        if (_scenario.Reused && !ReferenceEquals(ownerContext, _reused))
        {
            throw new InvalidOperationException("Reused-context identity changed.");
        }
        if (!ownerContext.Items.TryGetValue(VersionKey, out var stored) ||
            !environment.TryGetValue(VersionKey, out var exposed) ||
            !ReferenceEquals(stored, exposed) || ownerContext.Items.Count != _scenario.Padding + 3 ||
            environment[CancellationKey] is not CancellationToken token || token != CancellationToken.None)
        {
            throw new InvalidOperationException($"Actual version/token/count mismatch: {Case}.");
        }
        if (_scenario.Present)
        {
            if (!ReferenceEquals(stored, _existing))
            {
                throw new InvalidOperationException("Existing version identity changed.");
            }
        }
        else if (!Equals(stored, "1.0"))
        {
            throw new InvalidOperationException("Missing-version default changed.");
        }
        if (_scenario.Reused && (!ReferenceEquals(stored, _reusedVersion) ||
            !ReferenceEquals(ownerContext.Items[CancellationKey], _reusedCancellation)))
        {
            throw new InvalidOperationException("Reused constructor replaced existing identities.");
        }
        return $"ItemsType={ownerContext.Items.GetType().FullName};Count={ownerContext.Items.Count};" +
            $"Value={_scenario.Kind};Existing={_scenario.Present || _scenario.Reused};Cancellation=None";
    }

    private sealed record Scenario(string Name, bool Dictionary = false, bool Present = false,
        ValueKind Kind = ValueKind.Custom, bool Reused = false, int Padding = 0, bool RequestOnly = false);

    private enum ValueKind
    {
        Custom,
        Empty,
        Null,
        Object,
        Default
    }
}
