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
    public const int PropertyValue = 123;
    public const string Identifier = "actual.Property";
    public static readonly TimeSpan LongDeadline = TimeSpan.FromMinutes(5);
    public bool CompleteInline { get; set; }
    public bool ThrowOnDispatch { get; set; }
    public JSInvocationInfo Last { get; private set; }
    public JSInvocationInfo LastScalarWrite { get; private set; }
    public int DispatchCount { get; private set; }
    public int ScalarPropertyWriteCount { get; private set; }
    public long EmittedScalarValueChecksum { get; private set; }
    public int SuppliedReplies { get; private set; }

    public RuntimeBoundary(TimeSpan? defaultTimeout = null)
    {
        DefaultAsyncTimeout = defaultTimeout;
    }

    protected override void BeginInvokeJS(in JSInvocationInfo call)
    {
        Last = call;
        DispatchCount++;
        if (call.CallType == JSCallType.SetValue && call.ResultType == JSCallResultType.JSVoidResult &&
            call.TargetInstanceId == 0 && call.Identifier == Identifier && call.ArgsJson == "[123]")
        {
            LastScalarWrite = call;
            ScalarPropertyWriteCount++;
            EmittedScalarValueChecksum += PropertyValue;
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

    protected override void BeginInvokeJS(long taskId, string identifier, [StringSyntax("Json")] string? argsJson,
        JSCallResultType resultType, long targetInstanceId)
    {
        throw new InvalidOperationException("The actual runtime must dispatch JSInvocationInfo.");
    }

    protected override void EndInvokeDotNet(DotNetInvocationInfo call, in DotNetInvocationResult result)
    {
        throw new InvalidOperationException("This managed probe does not dispatch .NET invocations.");
    }

    public void Complete(in JSInvocationInfo call, bool success = true) =>
        CompleteJson(call, success ? "null" : "\"actual-protocol-failure\"", success);

    public void CompleteJson(in JSInvocationInfo call, string json, bool success = true)
    {
        DotNetDispatcher.EndInvokeJS(this, string.Concat("[", call.AsyncHandle.ToString(CultureInfo.InvariantCulture),
            success ? ",true," : ",false,", json, "]"));
        SuppliedReplies++;
    }

    public void ValidatePropertyWrite(in JSInvocationInfo call, string arguments = "[123]")
    {
        Require(call.AsyncHandle > 0 && call.TargetInstanceId == 0 && call.Identifier == Identifier &&
            call.CallType == JSCallType.SetValue && call.ResultType == JSCallResultType.JSVoidResult &&
            call.ArgsJson == arguments, "Actual setter handle/target/type/identifier/serialized value differ.");
    }

    public static ValueTask Start(IJSRuntime runtime, TimeoutPolicy policy) => StartValue(runtime, policy, PropertyValue);

    public static ValueTask StartValue<[DynamicallyAccessedMembers(ProjectionFlags.JsonMembers)] T>(
        IJSRuntime runtime, TimeoutPolicy policy, T value) => policy switch
        {
            TimeoutPolicy.Finite => JSRuntimeExtensions.SetValueAsync(runtime, Identifier, value, LongDeadline),
            TimeoutPolicy.Infinite => JSRuntimeExtensions.SetValueAsync(runtime, Identifier, value, Timeout.InfiniteTimeSpan),
            TimeoutPolicy.ExplicitNone => runtime.SetValueAsync(Identifier, value, CancellationToken.None),
            _ => throw new ArgumentOutOfRangeException(nameof(policy))
        };

    public static void Run(RuntimeBoundary runtime, TimeoutPolicy policy, ReplyWorkload workload)
    {
        if (workload == ReplyWorkload.Overlap8)
        {
            var calls = new JSInvocationInfo[8];
            var tasks = new Task[8];
            for (var i = 0; i < tasks.Length; i++)
            {
                tasks[i] = Start(runtime, policy).AsTask();
                Require(!tasks[i].IsCompleted, "Overlap needs eight actual pending setter requests.");
                calls[i] = runtime.Last;
            }
            for (var i = 0; i < tasks.Length; i++)
            {
                runtime.Complete(calls[i]);
                tasks[i].GetAwaiter().GetResult();
            }

            return;
        }
        var task = Start(runtime, policy);
        if (workload == ReplyWorkload.Deferred)
        {
            Require(!task.IsCompleted, "Deferred setter must be pending before its public null acknowledgment.");
            runtime.Complete(runtime.Last);
        }
        Require(task.IsCompletedSuccessfully, "Public null acknowledgment did not complete the actual setter.");
        task.GetAwaiter().GetResult();
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
    public Type? LastInputType { get; private set; }

    public ValueTask<T> InvokeAsync<[DynamicallyAccessedMembers(ProjectionFlags.JsonMembers)] T>(string identifier, object?[]? args)
    {
        LastResultType = typeof(T);

        return actual.InvokeAsync<T>(identifier, args);
    }

    public ValueTask<T> InvokeAsync<[DynamicallyAccessedMembers(ProjectionFlags.JsonMembers)] T>(
        string identifier, CancellationToken cancellationToken, object?[]? args)
    {
        LastResultType = typeof(T);
        LastToken = cancellationToken;
        RequestedAtEntry = cancellationToken.IsCancellationRequested;

        return actual.InvokeAsync<T>(identifier, cancellationToken, args);
    }

    public ValueTask SetValueAsync<[DynamicallyAccessedMembers(ProjectionFlags.JsonMembers)] T>(string identifier, T value)
    {
        LastInputType = typeof(T);

        return actual.SetValueAsync(identifier, value);
    }

    public ValueTask SetValueAsync<[DynamicallyAccessedMembers(ProjectionFlags.JsonMembers)] T>(
        string identifier, T value, CancellationToken cancellationToken)
    {
        LastInputType = typeof(T);
        LastToken = cancellationToken;
        RequestedAtEntry = cancellationToken.IsCancellationRequested;

        return actual.SetValueAsync(identifier, value, cancellationToken);
    }
}

internal sealed class DispatchFailure : Exception
{
}
