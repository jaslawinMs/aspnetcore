using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Actual public dictionary traversal or public-DI object validation.</summary>
[MemoryDiagnoser]
public class EnumerationBenchmark
{
    /// <summary>Independent explicit input labels;not observed production frequencies.</summary>
    public IEnumerable<string> Cases => Workload.Labels;

    /// <summary>Concrete caller shape or actual validation-state override.</summary>
    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private Workload? _workload;

    /// <summary>Verify complete real producers,inputs and outputs before timing.</summary>
    [GlobalSetup]
    public void Setup()
    {
        _workload = new Workload(Case);
        var receipt = new
        {
            label = Case,
            contract = _workload.Capture(),
            input = Evidence.WriteInput(_workload),
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId,
            completeRunsCheckedOutsideTiming = 2,
            originalOnlyNotPerformanceComparison = true
        };
        Evidence.Write("setup-" + Case, receipt);
        Console.WriteLine("AUTOPERF_F105_SETUP " + Evidence.Compact(receipt));
    }

    /// <summary>Consume complete traversal or actual object-validation checksum.</summary>
    [Benchmark]
    public int CompleteOwner()
    {
        var workload = _workload ?? throw new InvalidOperationException("Actual input setup is missing.");

        return workload.Run();
    }

    /// <summary>Release services and the deliberately retained interface.</summary>
    [GlobalCleanup]
    public void Cleanup()
    {
        _workload?.Dispose();
    }
}
