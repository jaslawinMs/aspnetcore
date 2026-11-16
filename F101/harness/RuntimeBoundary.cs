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

internal static class ProjectionFlags
{
    public const DynamicallyAccessedMemberTypes JsonMembers = DynamicallyAccessedMemberTypes.PublicConstructors |
        DynamicallyAccessedMemberTypes.PublicFields | DynamicallyAccessedMemberTypes.PublicProperties;
}

internal sealed class RuntimeBoundary : JSRuntime
{
    public const int TypedResult = 731;
    public const long ObjectId = 47;
    public const string Identifier = "actual.Property";
    public const string ReferenceIdentifier = "actual.ReferenceProperty";
    public const string ReferenceType = "Microsoft.JSInterop.Implementation.JSObjectReference";
    public static readonly TimeSpan LongDeadline = TimeSpan.FromMinutes(5);
    public bool CompleteInline { get; set; }
    public bool ThrowOnDispatch { get; set; }
    public TransportGate? Gate { get; set; }
    public JSInvocationInfo Last { get; private set; }
    public JSInvocationInfo LastProperty { get; private set; }
    public int DispatchCount { get; private set; }
    public int ScalarPropertyDispatchCount { get; private set; }

    public RuntimeBoundary(TimeSpan? defaultTimeout = null)
    {
        DefaultAsyncTimeout = defaultTimeout;
    }

    protected override void BeginInvokeJS(in JSInvocationInfo call)
    {
        Last = call;
        DispatchCount++;
        if (call.CallType == JSCallType.GetValue && call.Identifier == Identifier)
        {
            LastProperty = call;
            ScalarPropertyDispatchCount++;
        }
        if (ThrowOnDispatch)
        {
            throw new DispatchFailure();
        }
        Gate?.Hold();
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

    public void Complete(in JSInvocationInfo call, bool success = true, string? payload = null)
    {
        var result = payload ?? (success ? call.ResultType switch
        {
            JSCallResultType.JSObjectReference => "{\"__jsObjectId\":47}",
            JSCallResultType.JSVoidResult => "null",
            JSCallResultType.Default => "731",
            _ => throw new InvalidOperationException("Unexpected actual protocol result type.")
        } : "\"actual-protocol-failure\"");
        DotNetDispatcher.EndInvokeJS(this, string.Concat("[", call.AsyncHandle.ToString(CultureInfo.InvariantCulture),
            success ? ",true," : ",false,", result, "]"));
    }

    public void ValidateProperty(in JSInvocationInfo call)
    {
        Require(call.AsyncHandle > 0 && call.TargetInstanceId == 0 && call.Identifier == Identifier &&
            call.CallType == JSCallType.GetValue && call.ResultType == JSCallResultType.Default &&
            call.ArgsJson == "[]", "Actual scalar property handle/target/type/identifier/no-args protocol differs.");
    }

    public static void RequireReference(IJSObjectReference reference)
    {
        Require(reference.GetType().FullName == ReferenceType && reference.GetType().Assembly == typeof(JSRuntime).Assembly,
            "Actual public property reply did not produce the owning converter-created reference.");
    }

    public IJSObjectReference ReadReferenceProperty()
    {
        var task = GetValueAsync<IJSObjectReference>(ReferenceIdentifier, CancellationToken.None);
        var call = Last;
        Require(call.TargetInstanceId == 0 && call.Identifier == ReferenceIdentifier && call.CallType == JSCallType.GetValue &&
            call.ResultType == JSCallResultType.JSObjectReference && call.ArgsJson == "[]",
            "Reference-valued property control bypassed the actual GetValue/converter producer.");
        if (!task.IsCompleted)
        {
            Complete(call);
        }
        var reference = task.GetAwaiter().GetResult();
        RequireReference(reference);

        return reference;
    }

    public int VerifyMaterialReferenceProperty(IJSObjectReference reference)
    {
        RequireReference(reference);
        var task = reference.GetValueAsync<int>("nested.control", CancellationToken.None);
        var call = Last;
        Require(call.TargetInstanceId == ObjectId && call.Identifier == "nested.control" &&
            call.CallType == JSCallType.GetValue && call.ResultType == JSCallResultType.Default &&
            call.ArgsJson == "[]", "Actual reference property did not dispatch the material object-root target.");
        if (!task.IsCompleted)
        {
            Complete(call);
        }
        var value = task.GetAwaiter().GetResult();
        RequireValue(value);

        return value;
    }

    public static ValueTask<int> Start(IJSRuntime runtime, TimeoutPolicy policy) => policy switch
    {
        TimeoutPolicy.Finite => JSRuntimeExtensions.GetValueAsync<int>(runtime, Identifier, LongDeadline),
        TimeoutPolicy.Infinite => JSRuntimeExtensions.GetValueAsync<int>(runtime, Identifier, Timeout.InfiniteTimeSpan),
        TimeoutPolicy.ExplicitNone => runtime.GetValueAsync<int>(Identifier, CancellationToken.None),
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
                Require(!tasks[i].IsCompleted, "Overlap needs eight actual pending property requests.");
                calls[i] = runtime.Last;
            }
            var last = 0;
            for (var i = 0; i < tasks.Length; i++)
            {
                runtime.Complete(calls[i]);
                last = tasks[i].GetAwaiter().GetResult();
                RequireValue(last);
            }

            return last;
        }
        var task = Start(runtime, policy);
        if (workload == ReplyWorkload.Deferred)
        {
            Require(!task.IsCompleted, "Deferred property read must be pending before its public reply.");
            runtime.Complete(runtime.Last);
        }
        Require(task.IsCompletedSuccessfully, "Public value reply did not complete the actual property read.");
        var value = task.GetAwaiter().GetResult();
        RequireValue(value);

        return value;
    }

    public static void RequireValue(int value) => Require(value == TypedResult, "Actual public property value differs from731.");

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

    public ValueTask<T> InvokeAsync<[DynamicallyAccessedMembers(ProjectionFlags.JsonMembers)] T>(string identifier, object?[]? args)
    {
        LastResultType = typeof(T);

        return actual.InvokeAsync<T>(identifier, args);
    }

    public ValueTask<T> InvokeAsync<[DynamicallyAccessedMembers(ProjectionFlags.JsonMembers)] T>(string identifier, CancellationToken cancellationToken, object?[]? args)
    {
        LastResultType = typeof(T);
        LastToken = cancellationToken;
        RequestedAtEntry = cancellationToken.IsCancellationRequested;

        return actual.InvokeAsync<T>(identifier, cancellationToken, args);
    }

    public ValueTask<T> GetValueAsync<[DynamicallyAccessedMembers(ProjectionFlags.JsonMembers)] T>(string identifier)
    {
        LastResultType = typeof(T);

        return actual.GetValueAsync<T>(identifier);
    }

    public ValueTask<T> GetValueAsync<[DynamicallyAccessedMembers(ProjectionFlags.JsonMembers)] T>(string identifier, CancellationToken cancellationToken)
    {
        LastResultType = typeof(T);
        LastToken = cancellationToken;
        RequestedAtEntry = cancellationToken.IsCancellationRequested;

        return actual.GetValueAsync<T>(identifier, cancellationToken);
    }
}

internal sealed class TransportGate
{
    public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public void Hold()
    {
        Entered.SetResult();
        Release.Task.WaitAsync(TimeSpan.FromSeconds(5)).GetAwaiter().GetResult();
    }
}

internal sealed class DispatchFailure : Exception
{
}
