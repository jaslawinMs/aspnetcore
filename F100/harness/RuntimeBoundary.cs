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
    public const int TypedResult = 731;
    public const long ObjectId = 47;
    public const string Identifier = "actual.Constructor";
    public const string ReferenceType = "Microsoft.JSInterop.Implementation.JSObjectReference";
    public static readonly object?[] Arguments = [123, "actual-argument"];
    public static readonly TimeSpan LongDeadline = TimeSpan.FromMinutes(5);
    public bool CompleteInline { get; set; }
    public bool ThrowOnDispatch { get; set; }
    public JSInvocationInfo Last { get; private set; }
    public JSInvocationInfo LastConstructor { get; private set; }
    public int DispatchCount { get; private set; }
    public int ConstructorDispatchCount { get; private set; }

    public RuntimeBoundary(TimeSpan? defaultTimeout = null)
    {
        DefaultAsyncTimeout = defaultTimeout;
    }

    protected override void BeginInvokeJS(in JSInvocationInfo call)
    {
        Last = call;
        DispatchCount++;
        if (call.CallType == JSCallType.ConstructorCall)
        {
            LastConstructor = call;
            ConstructorDispatchCount++;
        }
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
        var result = success ? call.ResultType switch
        {
            JSCallResultType.JSObjectReference => "{\"__jsObjectId\":47}",
            JSCallResultType.JSVoidResult => "null",
            JSCallResultType.Default => "731",
            _ => throw new InvalidOperationException("Unexpected actual protocol result type.")
        } : "\"actual-protocol-failure\"";
        DotNetDispatcher.EndInvokeJS(this, string.Concat("[", call.AsyncHandle.ToString(CultureInfo.InvariantCulture),
            success ? ",true," : ",false,", result, "]"));
    }

    public void ValidateConstructor(in JSInvocationInfo call)
    {
        Require(call.AsyncHandle > 0 && call.TargetInstanceId == 0 && call.Identifier == Identifier &&
            call.CallType == JSCallType.ConstructorCall && call.ResultType == JSCallResultType.JSObjectReference &&
            call.ArgsJson == "[123,\"actual-argument\"]", "Actual constructor handle/target/type/identifier/arguments differ.");
    }

    public static void RequireReference(IJSObjectReference reference)
    {
        Require(reference.GetType().FullName == ReferenceType && reference.GetType().Assembly == typeof(JSRuntime).Assembly,
            "Actual public constructor reply did not produce the owning converter-created reference.");
    }

    public int VerifyMaterialReference(IJSObjectReference reference)
    {
        RequireReference(reference);
        var task = reference.InvokeAsync<int>("constructed.control", CancellationToken.None, Arguments);
        var call = Last;
        Require(call.TargetInstanceId == ObjectId && call.Identifier == "constructed.control" &&
            call.CallType == JSCallType.FunctionCall && call.ResultType == JSCallResultType.Default &&
            call.ArgsJson == "[123,\"actual-argument\"]", "Constructed public reference did not dispatch the actual material target.");
        if (!task.IsCompleted)
        {
            Complete(call);
        }
        var value = task.GetAwaiter().GetResult();
        Require(value == TypedResult, "Constructed material target control returned a wrong public typed value.");

        return value;
    }

    public static ValueTask<IJSObjectReference> Start(IJSRuntime runtime, TimeoutPolicy policy, object?[]? arguments = null) => policy switch
    {
        TimeoutPolicy.Finite => JSRuntimeExtensions.InvokeConstructorAsync(runtime, Identifier, LongDeadline, arguments ?? Arguments),
        TimeoutPolicy.Infinite => JSRuntimeExtensions.InvokeConstructorAsync(runtime, Identifier, Timeout.InfiniteTimeSpan, arguments ?? Arguments),
        TimeoutPolicy.ExplicitNone => JSRuntimeExtensions.InvokeConstructorAsync(runtime, Identifier, CancellationToken.None, arguments ?? Arguments),
        _ => throw new ArgumentOutOfRangeException(nameof(policy))
    };

    public static IJSObjectReference Run(RuntimeBoundary runtime, TimeoutPolicy policy, ReplyWorkload workload)
    {
        if (workload == ReplyWorkload.Overlap8)
        {
            var calls = new JSInvocationInfo[8];
            var tasks = new Task<IJSObjectReference>[8];
            for (var i = 0; i < tasks.Length; i++)
            {
                tasks[i] = Start(runtime, policy).AsTask();
                Require(!tasks[i].IsCompleted, "Overlap needs eight actual pending constructor requests.");
                calls[i] = runtime.Last;
            }
            IJSObjectReference? last = null;
            for (var i = 0; i < tasks.Length; i++)
            {
                runtime.Complete(calls[i]);
                last = tasks[i].GetAwaiter().GetResult();
                RequireReference(last);
            }

            return last ?? throw new InvalidOperationException("No real constructed reference returned.");
        }
        var task = Start(runtime, policy);
        if (workload == ReplyWorkload.Deferred)
        {
            Require(!task.IsCompleted, "Deferred constructor must be pending before its actual reference reply.");
            runtime.Complete(runtime.Last);
        }
        Require(task.IsCompletedSuccessfully, "Public reference reply did not complete the actual constructor.");
        var reference = task.GetAwaiter().GetResult();
        RequireReference(reference);

        return reference;
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
    public Type? LastResultType { get; private set; }

    public ValueTask<T> InvokeAsync<T>(string identifier, object?[]? args)
    {
        LastResultType = typeof(T);

        return actual.InvokeAsync<T>(identifier, args);
    }

    public ValueTask<T> InvokeAsync<T>(string identifier, CancellationToken cancellationToken, object?[]? args)
    {
        LastResultType = typeof(T);
        LastToken = cancellationToken;
        RequestedAtEntry = cancellationToken.IsCancellationRequested;

        return actual.InvokeAsync<T>(identifier, cancellationToken, args);
    }

    public ValueTask<IJSObjectReference> InvokeConstructorAsync(string identifier, object?[]? args)
    {
        LastResultType = typeof(IJSObjectReference);

        return actual.InvokeConstructorAsync(identifier, args);
    }

    public ValueTask<IJSObjectReference> InvokeConstructorAsync(string identifier, CancellationToken cancellationToken, object?[]? args)
    {
        LastResultType = typeof(IJSObjectReference);
        LastToken = cancellationToken;
        RequestedAtEntry = cancellationToken.IsCancellationRequested;

        return actual.InvokeConstructorAsync(identifier, cancellationToken, args);
    }
}

internal sealed class DispatchFailure : Exception
{
}
