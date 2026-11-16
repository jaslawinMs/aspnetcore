using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Infrastructure;

namespace AutoPerf;

public enum TimeoutPolicy
{
    Finite, Infinite, ExplicitNone
}

public enum ReplyWorkload
{
    Inline, Deferred, Overlap8
}

internal sealed class RuntimeBoundary : JSRuntime
{
    public const int Result = 731;
    public const string Identifier = "actual.member";
    public static readonly object?[] Arguments = [123, "actual-argument"];
    public static readonly TimeSpan LongDeadline = TimeSpan.FromMinutes(5);
    public bool CompleteInline { get; set; }
    public bool ThrowOnDispatch { get; set; }
    public JSInvocationInfo Last { get; private set; }
    public int DispatchCount { get; private set; }
    public RuntimeBoundary(TimeSpan? defaultTimeout = null)
    {
        DefaultAsyncTimeout = defaultTimeout;
    }

    protected override void BeginInvokeJS(in JSInvocationInfo call)
    {
        Last = call;
        DispatchCount++;
        if (ThrowOnDispatch)
        {
            throw new DispatchFailure();
        }
        if (CompleteInline)
        {
            Complete(call);
        }
    }

    protected override void BeginInvokeJS(long taskId, string identifier, [StringSyntax("Json")] string? argsJson, JSCallResultType resultType, long targetInstanceId)
    {
        throw new InvalidOperationException("The actual runtime must dispatch JSInvocationInfo.");
    }

    protected override void EndInvokeDotNet(DotNetInvocationInfo call, in DotNetInvocationResult result)
    {
        throw new InvalidOperationException("This managed probe does not dispatch .NET invocations.");
    }

    public void Complete(in JSInvocationInfo call, bool success = true)
    {
        DotNetDispatcher.EndInvokeJS(this, string.Concat("[", call.AsyncHandle.ToString(CultureInfo.InvariantCulture),
            success ? ",true,731]" : ",false,\"actual-protocol-failure\"]"));
    }

    public void Validate(in JSInvocationInfo call)
    {
        Require(call.AsyncHandle > 0 && call.TargetInstanceId == 0 && call.Identifier == Identifier &&
            call.CallType == JSCallType.FunctionCall && call.ResultType == JSCallResultType.Default &&
            call.ArgsJson == "[123,\"actual-argument\"]", "Actual invocation handle/target/type/identifier/arguments differ.");
    }

    public static ValueTask<int> Start(IJSRuntime runtime, TimeoutPolicy policy, object?[]? arguments = null) => policy switch
    {
        TimeoutPolicy.Finite => JSRuntimeExtensions.InvokeAsync<int>(runtime, Identifier, LongDeadline, arguments ?? Arguments),
        TimeoutPolicy.Infinite => JSRuntimeExtensions.InvokeAsync<int>(runtime, Identifier, System.Threading.Timeout.InfiniteTimeSpan, arguments ?? Arguments),
        TimeoutPolicy.ExplicitNone => JSRuntimeExtensions.InvokeAsync<int>(runtime, Identifier, CancellationToken.None, arguments ?? Arguments),
        _ => throw new ArgumentOutOfRangeException(nameof(policy))
    };

    public static int Run(RuntimeBoundary runtime, TimeoutPolicy policy, ReplyWorkload workload)
    {
        if (workload == ReplyWorkload.Overlap8)
        {
            var calls = new JSInvocationInfo[8];
            var tasks = new Task<int>[8];
            for (var i = 0; i < tasks.Length; i++)
            {
                tasks[i] = Start(runtime, policy).AsTask();
                Require(!tasks[i].IsCompleted, "Overlap needs eight actual pending producer requests.");
                calls[i] = runtime.Last;
            }
            var checksum = 0;
            for (var i = 0; i < tasks.Length; i++)
            {
                runtime.Complete(calls[i]);
                checksum += tasks[i].GetAwaiter().GetResult();
            }

            return checksum;
        }
        var value = Start(runtime, policy);
        if (workload == ReplyWorkload.Deferred)
        {
            Require(!value.IsCompleted, "Deferred call must be pending before its actual public reply.");
            runtime.Complete(runtime.Last);
        }
        Require(value.IsCompletedSuccessfully, "Public reply did not complete the actual invocation.");

        return value.GetAwaiter().GetResult();
    }

    public static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}

internal sealed class RetainingRuntime(IJSRuntime actual) : IJSRuntime
{
    public CancellationToken LastToken { get; private set; }
    public bool RequestedAtEntry { get; private set; }

    public ValueTask<T> InvokeAsync<T>(string identifier, object?[]? args) => actual.InvokeAsync<T>(identifier, args);

    public ValueTask<T> InvokeAsync<T>(string identifier, CancellationToken cancellationToken, object?[]? args)
    {
        LastToken = cancellationToken;
        RequestedAtEntry = cancellationToken.IsCancellationRequested;

        return actual.InvokeAsync<T>(identifier, cancellationToken, args);
    }
}

internal sealed class DispatchFailure : Exception
{
}
