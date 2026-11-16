using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Measures original real-runtime completion, not a proposed timeout replacement.</summary>
[MemoryDiagnoser]
public class TimeoutBenchmark
{
    private RuntimeBoundary _runtime = null!;
    private Microsoft.JSInterop.IJSObjectReference _reference = null!;
    private CallOperation _operation;
    private TimeoutPolicy _policy;
    private ReplyTiming _reply;

    /// <summary>The separately exercised original operation.</summary>
    [Params(nameof(CallOperation.Invoke), nameof(CallOperation.InvokeVoid), nameof(CallOperation.Constructor), nameof(CallOperation.Get), nameof(CallOperation.Set))]
    public string Operation { get; set; } = null!;

    /// <summary>Different documented deadline contracts; neither is a source-change variant.</summary>
    [Params(nameof(TimeoutPolicy.Finite), nameof(TimeoutPolicy.Infinite))]
    public string Policy { get; set; } = null!;

    /// <summary>The harness-owned public protocol reply timing, not browser timing.</summary>
    [Params(nameof(ReplyTiming.Inline), nameof(ReplyTiming.Deferred))]
    public string Reply { get; set; } = null!;

    /// <summary>Verifies each actual operation, argument, target and result before timing.</summary>
    [GlobalSetup]
    public void Setup()
    {
        _operation = Enum.Parse<CallOperation>(Operation);
        _policy = Enum.Parse<TimeoutPolicy>(Policy);
        _reply = Enum.Parse<ReplyTiming>(Reply);
        _runtime = new RuntimeBoundary { CompleteInline = _reply == ReplyTiming.Inline };
        _reference = _runtime.CreateReference();
        for (var index = 0; index < 2; index++)
        {
            RuntimeBoundary.Require(Invoke() == RuntimeBoundary.Result, "Actual setup result differs.");
            _runtime.ValidateDispatch(_operation);
        }
        var receipt = new
        {
            operation = Operation, policy = Policy, reply = Reply, actualSetupRuns = 2,
            ownerSha256 = Evidence.OwnerSha256, harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId, actualReferenceType = _reference.GetType().FullName,
            dispatchCount = _runtime.DispatchCount, asyncHandle = _runtime.Last.AsyncHandle,
            targetId = _runtime.Last.TargetInstanceId, callType = _runtime.Last.CallType.ToString(),
            resultType = _runtime.Last.ResultType.ToString(), argsJson = _runtime.Last.ArgsJson,
            checksum = RuntimeBoundary.Result
        };
        Evidence.Write($"setup-{Operation}-{Policy}-{Reply}", receipt);
        Console.WriteLine("AUTOPERF_F096_SETUP " + Evidence.Compact(receipt));
    }

    /// <summary>Consumes the actual completed owner task and its result.</summary>
    [Benchmark]
    public int Invoke() => Calls.Run(_operation, _policy, _reply, _runtime, _reference);

    /// <summary>Disposes the harness runtime after its owned replies have completed.</summary>
    [GlobalCleanup]
    public void Cleanup() => _runtime.Dispose();
}
