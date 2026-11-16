using BenchmarkDotNet.Attributes;

namespace AutoPerf;

[MemoryDiagnoser]
public class TimeoutBenchmark
{
    [Params(TimeoutPolicy.Finite, TimeoutPolicy.Infinite, TimeoutPolicy.ExplicitNone)]
    public TimeoutPolicy Policy { get; set; }

    [Params(ReplyWorkload.Inline, ReplyWorkload.Deferred, ReplyWorkload.Overlap8)]
    public ReplyWorkload Workload { get; set; }

    private RuntimeBoundary? _runtime;

    [GlobalSetup]
    public void Setup()
    {
        _runtime = new RuntimeBoundary(TimeSpan.FromMilliseconds(100))
        {
            CompleteInline = Workload == ReplyWorkload.Inline
        };
        var first = RuntimeBoundary.Run(_runtime, Policy, Workload);
        var second = RuntimeBoundary.Run(_runtime, Policy, Workload);
        var callsPerInvoke = Workload == ReplyWorkload.Overlap8 ? 8 : 1;
        RuntimeBoundary.Require(first == RuntimeBoundary.Result * callsPerInvoke && second == first &&
            _runtime.DispatchCount == callsPerInvoke * 2, "Actual setup values/public producer count differ.");
        _runtime.Validate(_runtime.Last);
        var call = _runtime.Last;
        var receipt = new
        {
            policy = Policy.ToString(),
            workload = Workload.ToString(),
            callsPerInvoke,
            setupInvocations = 2,
            actualSetupRequests = _runtime.DispatchCount,
            checksum = first + second,
            call.AsyncHandle,
            call.TargetInstanceId,
            call.Identifier,
            call.CallType,
            call.ResultType,
            call.ArgsJson,
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId
        };
        Evidence.Write($"setup-{Policy}-{Workload}", receipt);
        Console.WriteLine($"AUTOPERF_F098_SETUP {Evidence.Compact(receipt)}");
    }

    [GlobalCleanup]
    public void Cleanup() => _runtime?.Dispose();

    [Benchmark]
    public int ActualExplicitTimeout()
    {
        var runtime = _runtime ?? throw new InvalidOperationException("Actual runtime setup missing.");

        return RuntimeBoundary.Run(runtime, Policy, Workload);
    }
}
