using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Measures prepared owner matching and actual managed menu notifications separately by profile.</summary>
[MemoryDiagnoser]
public class NavLinkBenchmark
{
    private NavLinkFixture? _fixture;

    /// <summary>Gets all stable, report-safe scenario descriptors.</summary>
    public IEnumerable<NavCase> Cases => NavCases.All;

    /// <summary>Gets or sets the scenario selected by BenchmarkDotNet.</summary>
    [ParamsSource(nameof(Cases))]
    public NavCase Case { get; set; } = NavCases.All[0];

    /// <summary>Initializes actual components outside the measured operation.</summary>
    [GlobalSetup]
    public void Setup()
    {
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Sha256}");
        _fixture = new NavLinkFixture(Case, strict: false);
        _fixture.Validate();
    }

    /// <summary>Executes the selected real owner or managed notification path.</summary>
    [Benchmark]
    public int Exercise()
    {
        return (_fixture ?? throw new InvalidOperationException("GlobalSetup did not run.")).Exercise();
    }

    /// <summary>Verifies final output and releases the real renderer and subscriptions.</summary>
    [GlobalCleanup]
    public void Cleanup()
    {
        var fixture = _fixture ?? throw new InvalidOperationException("GlobalSetup did not run.");
        try
        {
            fixture.Validate();
        }
        finally
        {
            fixture.Dispose();
        }
    }
}
