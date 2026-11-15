using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Measures actual prepared public resource-filter calls, not complete HTTP requests.</summary>
[MemoryDiagnoser]
public class FormatFilterBenchmark
{
    private FormatFilterFixture? _fixture;

    /// <summary>Gets stable report-safe scenario names.</summary>
    public IEnumerable<string> Cases => FilterCases.All.Select(@case => @case.Name);

    /// <summary>Gets or sets the selected scenario name.</summary>
    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = FilterCases.All[0].Name;

    /// <summary>Prepares real mapping, metadata, request and filter owners outside timing.</summary>
    [GlobalSetup]
    public void Setup()
    {
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Sha256}");
        _fixture = new FormatFilterFixture(FilterCases.All.Single(@case => @case.Name == Case));
        _fixture.Validate();
    }

    /// <summary>Resets the prepared result slot and invokes the actual resource filter.</summary>
    [Benchmark]
    public int ResourceFilter()
    {
        return (_fixture ?? throw new InvalidOperationException("GlobalSetup did not run.")).Exercise();
    }

    /// <summary>Verifies the same observable contract after measurement.</summary>
    [GlobalCleanup]
    public void Cleanup()
    {
        (_fixture ?? throw new InvalidOperationException("GlobalSetup did not run.")).Validate();
    }
}
