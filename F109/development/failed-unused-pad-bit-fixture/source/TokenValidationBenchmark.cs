using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Actual public manager dispatch,registered provider,decoder,protector and parser.</summary>
[MemoryDiagnoser]
public class TokenValidationBenchmark
{
    /// <summary>Explicit synthetic inputs,not observed workload frequencies.</summary>
    public IEnumerable<string> Cases => TokenFixture.Labels;

    /// <summary>The declared exact shared caller input.</summary>
    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private Workload? _workload;

    /// <summary>Verify the actual complete producer/consumer/log/exception contract outside timing.</summary>
    [GlobalSetup]
    public void Setup()
    {
        _workload = new Workload(TokenFixture.Load(Evidence.FixtureDirectory, Case), Evidence.FixtureDirectory);
        var receipt = new
        {
            label = Case, variant = Evidence.Variant, contract = _workload.Capture(),
            input = Evidence.WriteInput(Case), ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256, processId = Environment.ProcessId,
            completeRunsCheckedOutsideTiming = 2
        };
        Evidence.Write("setup-" + Case, receipt);
        Console.WriteLine("AUTOPERF_F109_SETUP " + Evidence.Compact(receipt));
    }

    /// <summary>Complete actual UserManager verification;setup and diagnostics excluded.</summary>
    [Benchmark]
    public Task<bool> VerifyToken()
    {
        var workload = _workload ?? throw new InvalidOperationException("Actual shared input setup is missing.");

        return workload.Run();
    }

    /// <summary>Release the actual manager,store and public service provider.</summary>
    [GlobalCleanup]
    public void Cleanup()
    {
        _workload?.Dispose();
    }
}
