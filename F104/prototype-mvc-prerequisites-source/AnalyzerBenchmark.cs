using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Complete real route-analyzer driver execution with the compilation-start pool included.</summary>
[MemoryDiagnoser]
public class AnalyzerBenchmark
{
    /// <summary>Controlled endpoint workload.</summary>
    [Params(RouteWorkload.Empty, RouteWorkload.SmallUnique, RouteWorkload.SmallDuplicate,
        RouteWorkload.WideUnique, RouteWorkload.WideDuplicate)]
    public RouteWorkload Workload { get; set; }

    /// <summary>Actual Roslyn scheduling option.</summary>
    [Params(DriverMode.Serial, DriverMode.Concurrent)]
    public DriverMode Mode { get; set; }

    private CompilationWorkload? _workload;

    /// <summary>Bind real metadata and check two complete diagnostic runs before timing.</summary>
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
            syntaxTrees = _workload.Inputs.Count,
            _workload.BoundRouteInvocations,
            _workload.LiteralRouteInvocations,
            setupCompleteDriverRuns = 2,
            freshDriverAndCompilationStartPoolPerInvocation = true,
            firstDiagnostics = first,
            secondDiagnostics = second,
            benchmarkReturnType = "Task<int>",
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId
        };
        Evidence.Write($"setup-{Workload}-{Mode}", receipt);
        Console.WriteLine("AUTOPERF_F104_SETUP " + Evidence.Compact(receipt));
    }

    /// <summary>Await and consume the actual analyzer's complete diagnostics.</summary>
    [Benchmark]
    public async Task<int> ActualRouteHandlerAnalyzer()
    {
        var workload = _workload ?? throw new InvalidOperationException("Real compiler setup is missing.");
        var diagnostics = await workload.AnalyzeAsync();

        return diagnostics.Length;
    }
}
