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
        var last = RuntimeBoundary.Run(_runtime, Policy, Workload);
        var callsPerInvoke = Workload == ReplyWorkload.Overlap8 ? 8 : 1;
        RuntimeBoundary.Require(first == RuntimeBoundary.TypedResult && last == RuntimeBoundary.TypedResult &&
            _runtime.ScalarPropertyDispatchCount == callsPerInvoke * 2, "Actual property setup values/count differ.");
        _runtime.ValidateProperty(_runtime.LastProperty);
        var call = _runtime.LastProperty;
        var reference = _runtime.ReadReferenceProperty();
        var material = _runtime.VerifyMaterialReferenceProperty(reference);
        RuntimeBoundary.Require(_runtime.DispatchCount == callsPerInvoke * 2 + 2, "Actual property setup/scope-control count differs.");
        var receipt = new
        {
            policy = Policy.ToString(),
            workload = Workload.ToString(),
            callsPerInvoke,
            setupInvocations = 2,
            actualPropertyRequests = _runtime.ScalarPropertyDispatchCount,
            actualTotalSetupRequests = _runtime.DispatchCount,
            successfullyConsumedPropertyValues = callsPerInvoke * 2,
            actualBenchmarkReturnType = typeof(int).FullName,
            actualPropertyValue = last,
            actualPropertyReply = "731",
            referencePropertyControlRequests = 2,
            referencePropertyControlTarget = RuntimeBoundary.ObjectId,
            referencePropertyControlValue = material,
            actualReturnedReferenceType = reference.GetType().FullName,
            actualReferencePropertyReply = "{\"__jsObjectId\":47}",
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
        Console.WriteLine($"AUTOPERF_F101_SETUP {Evidence.Compact(receipt)}");
    }

    [GlobalCleanup]
    public void Cleanup() => _runtime?.Dispose();

    [Benchmark]
    public int ActualExplicitPropertyReadTimeout()
    {
        var runtime = _runtime ?? throw new InvalidOperationException("Actual property runtime setup missing.");

        return RuntimeBoundary.Run(runtime, Policy, Workload);
    }
}
