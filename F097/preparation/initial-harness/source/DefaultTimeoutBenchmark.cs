using BenchmarkDotNet.Attributes;
using Microsoft.JSInterop.Infrastructure;

namespace AutoPerf;

[MemoryDiagnoser]
public class DefaultTimeoutBenchmark
{
    [Params(CallOperation.Invoke, CallOperation.InvokeVoid, CallOperation.Constructor, CallOperation.Get, CallOperation.Set)]
    public CallOperation Operation { get; set; }

    [Params(TimeoutPolicy.Finite, TimeoutPolicy.Unconfigured)]
    public TimeoutPolicy Policy { get; set; }

    [Params(Workload.WindowInline, Workload.WindowDeferred, Workload.ObjectInline, Workload.ObjectDeferred, Workload.Overlap8)]
    public Workload Workload { get; set; }

    private RuntimeBoundary? _runtime;

    [GlobalSetup]
    public void Setup()
    {
        _runtime = new RuntimeBoundary(Calls.TimeoutFor(Policy))
        {
            CompleteInline = Workload is Workload.WindowInline or Workload.ObjectInline
        };
        var first = Calls.Run(Operation, Workload, _runtime);
        var second = Calls.Run(Operation, Workload, _runtime);
        var callsPerInvoke = Workload == Workload.Overlap8 ? 8 : 1;
        RuntimeBoundary.Require(first == RuntimeBoundary.Result * callsPerInvoke && second == first
            && _runtime.DispatchCount == callsPerInvoke * 2, "Actual two-invocation setup output/producer count differs.");
        _runtime.Validate(_runtime.Last, Operation, Workload is Workload.ObjectInline or Workload.ObjectDeferred);
        var call = _runtime.Last;
        var receipt = new
        {
            operation = Operation.ToString(),
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
        Evidence.Write($"setup-{Operation}-{Policy}-{Workload}", receipt);
        Console.WriteLine($"AUTOPERF_F097_SETUP {Evidence.Compact(receipt)}");
    }

    [GlobalCleanup]
    public void Cleanup() => _runtime?.Dispose();

    [Benchmark]
    public int ActualDefaultTimeout()
    {
        var runtime = _runtime ?? throw new InvalidOperationException("Actual runtime setup missing.");

        return Calls.Run(Operation, Workload, runtime);
    }
}
