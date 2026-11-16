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
        RuntimeBoundary.Run(_runtime, Policy, Workload);
        RuntimeBoundary.Run(_runtime, Policy, Workload);
        var callsPerInvoke = Workload == ReplyWorkload.Overlap8 ? 8 : 1;
        RuntimeBoundary.Require(_runtime.ScalarPropertyWriteCount == callsPerInvoke * 2 &&
            _runtime.SuppliedReplies == callsPerInvoke * 2 &&
            _runtime.EmittedScalarValueChecksum == callsPerInvoke * 2 * RuntimeBoundary.PropertyValue,
            "Actual scalar setter setup/acknowledgment/count/checksum differ.");
        var call = _runtime.LastScalarWrite;
        _runtime.ValidatePropertyWrite(call);
        var array = RuntimeBoundary.StartValue(_runtime, Policy, new[] { 123, 731 });
        _runtime.ValidatePropertyWrite(_runtime.Last, "[[123,731]]");
        if (!array.IsCompleted)
        {
            _runtime.Complete(_runtime.Last);
        }
        RuntimeBoundary.Require(array.IsCompletedSuccessfully && _runtime.DispatchCount == callsPerInvoke * 2 + 1 &&
            _runtime.SuppliedReplies == callsPerInvoke * 2 + 1, "Actual array-value serialization/ack control differs.");
        array.GetAwaiter().GetResult();
        var receipt = new
        {
            policy = Policy.ToString(),
            workload = Workload.ToString(),
            callsPerInvoke,
            setupInvocations = 2,
            actualScalarSetterRequests = _runtime.ScalarPropertyWriteCount,
            actualTotalSetupRequests = _runtime.DispatchCount,
            successfullyConsumedScalarAcknowledgments = callsPerInvoke * 2,
            actuallyEmittedScalarValueChecksum = _runtime.EmittedScalarValueChecksum,
            actualBenchmarkReturnType = typeof(void).FullName,
            actualSetterValue = RuntimeBoundary.PropertyValue,
            actualSetterReply = "null",
            arrayValueControlRequests = 1,
            arrayValueControlArguments = "[[123,731]]",
            successfullyConsumedArrayAcknowledgments = 1,
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
        Console.WriteLine($"AUTOPERF_F102_SETUP {Evidence.Compact(receipt)}");
    }

    [GlobalCleanup]
    public void Cleanup() => _runtime?.Dispose();

    [Benchmark]
    public void ActualExplicitPropertyWriteTimeout()
    {
        var runtime = _runtime ?? throw new InvalidOperationException("Actual setter runtime setup missing.");
        RuntimeBoundary.Run(runtime, Policy, Workload);
    }
}
