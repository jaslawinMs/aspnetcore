using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Complete public analyzer execution over controlled real-component compilations.</summary>
[MemoryDiagnoser]
public class AnalyzerBenchmark
{
    /// <summary>Controlled input shape.</summary>
    [Params(ComponentWorkload.Empty, ComponentWorkload.LifecycleOnly, ComponentWorkload.EventOnly,
        ComponentWorkload.SmallPopulated, ComponentWorkload.WidePartials)]
    public ComponentWorkload Workload { get; set; }

    /// <summary>Actual driver concurrency option.</summary>
    [Params(DriverMode.Serial, DriverMode.Concurrent)]
    public DriverMode Mode { get; set; }

    private CompilationWorkload? _workload;

    /// <summary>Bind real framework metadata and validate two actual complete analyzer runs.</summary>
    [GlobalSetup]
    public async Task SetupAsync()
    {
        _workload = CompilationWorkload.Create(Workload, Mode);
        _workload.WriteInputProof();
        var first = _workload.Validate(await _workload.AnalyzeAsync());
        var second = _workload.Validate(await _workload.AnalyzeAsync());
        var receipt = new
        {
            workload = Workload.ToString(),
            mode = Mode.ToString(),
            _workload.Components,
            syntaxTrees = _workload.Inputs.Count,
            _workload.FactoryInvocations,
            _workload.HandlerTargets,
            _workload.BoundStateCalls,
            setupCompleteDriverRuns = 2,
            freshDriverPerInvocation = true,
            firstDiagnostics = first,
            secondDiagnostics = second,
            benchmarkReturnType = "Task<int>",
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId
        };
        Evidence.Write($"setup-{Workload}-{Mode}", receipt);
        Console.WriteLine($"AUTOPERF_F103_SETUP {Evidence.Compact(receipt)}");
    }

    /// <summary>Run a fresh actual Roslyn driver and consume its completed diagnostic count.</summary>
    [Benchmark]
    public async Task<int> ActualStateHasChangedAnalyzer()
    {
        var workload = _workload ?? throw new InvalidOperationException("Actual compiler workload setup is missing.");
        var diagnostics = await workload.AnalyzeAsync();

        return diagnostics.Length;
    }
}
