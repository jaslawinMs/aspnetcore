using BenchmarkDotNet.Attributes;
using Microsoft.JSInterop;

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
        var last = RuntimeBoundary.Run(_runtime, Policy, Workload);
        var callsPerInvoke = Workload == ReplyWorkload.Overlap8 ? 8 : 1;
        RuntimeBoundary.Require(_runtime.ConstructorDispatchCount == callsPerInvoke * 2, "Actual constructor setup count differs.");
        _runtime.ValidateConstructor(_runtime.LastConstructor);
        var call = _runtime.LastConstructor;
        _runtime.VerifyMaterialReference(first);
        _runtime.VerifyMaterialReference(last);
        RuntimeBoundary.Require(_runtime.DispatchCount == callsPerInvoke * 2 + 2, "Actual constructor setup/material-control count differs.");
        var receipt = new
        {
            policy = Policy.ToString(),
            workload = Workload.ToString(),
            callsPerInvoke,
            setupInvocations = 2,
            actualConstructorRequests = _runtime.ConstructorDispatchCount,
            actualTotalSetupRequests = _runtime.DispatchCount,
            successfullyReturnedConstructorReferences = callsPerInvoke * 2,
            materialControlRequests = 2,
            materialControlTarget = RuntimeBoundary.ObjectId,
            materialControlValue = RuntimeBoundary.TypedResult,
            actualReturnedReferenceType = last.GetType().FullName,
            actualProtocolResult = "{\"__jsObjectId\":47}",
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
        Console.WriteLine($"AUTOPERF_F100_SETUP {Evidence.Compact(receipt)}");
    }

    [GlobalCleanup]
    public void Cleanup() => _runtime?.Dispose();

    [Benchmark]
    public IJSObjectReference ActualExplicitConstructorTimeout()
    {
        var runtime = _runtime ?? throw new InvalidOperationException("Actual constructor runtime setup missing.");

        return RuntimeBoundary.Run(runtime, Policy, Workload);
    }
}
