using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Text.Json;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Implementation;
using Microsoft.JSInterop.Infrastructure;

namespace AutoPerf;

internal enum CallOperation
{
    Invoke, InvokeVoid, Constructor, Get, Set
}

internal enum TimeoutPolicy
{
    Finite, Infinite
}

internal enum ReplyTiming
{
    Inline, Deferred
}

internal sealed class RuntimeBoundary : JSRuntime
{
    public const long TargetId = 47;
    public const long CreatedId = 89;
    public const int Result = 731;
    public static readonly object?[] Arguments = [123, "actual-argument"];
    public bool CompleteInline { get; set; }
    public bool ThrowOnDispatch { get; set; }
    public int DispatchCount { get; private set; }
    public JSInvocationInfo Last { get; private set; }

    public RuntimeBoundary(TimeSpan? defaultTimeout = null)
    {
        DefaultAsyncTimeout = defaultTimeout;
    }

    public IJSObjectReference CreateReference()
    {
        var reference = JsonSerializer.Deserialize<IJSObjectReference>("{\"__jsObjectId\":47}", JsonSerializerOptions)
            ?? throw new InvalidDataException("Actual JSRuntime converter returned null.");
        Require(reference.GetType() == typeof(JSObjectReference), "Actual converter did not create the actual JSObjectReference.");
        return reference;
    }

    public string SerializeReference(IJSObjectReference reference) => JsonSerializer.Serialize(reference, JsonSerializerOptions);

    protected override void BeginInvokeJS(in JSInvocationInfo invocationInfo)
    {
        Last = invocationInfo;
        DispatchCount++;
        if (ThrowOnDispatch)
        {
            throw new DispatchFailure();
        }
        if (CompleteInline)
        {
            Complete();
        }
    }

    protected override void BeginInvokeJS(long taskId, string identifier, [StringSyntax("Json")] string? argsJson, JSCallResultType resultType, long targetInstanceId)
    {
        throw new InvalidOperationException("The actual object-reference call must use JSInvocationInfo.");
    }

    protected override void EndInvokeDotNet(DotNetInvocationInfo invocationInfo, in DotNetInvocationResult invocationResult)
    {
        throw new InvalidOperationException("This probe does not dispatch .NET invocations.");
    }

    public void Complete(bool success = true)
    {
        var payload = success
            ? Last.ResultType == JSCallResultType.JSObjectReference ? "{\"__jsObjectId\":89}"
            : Last.ResultType == JSCallResultType.JSVoidResult || Last.CallType == JSCallType.SetValue ? "null" : "731"
            : "\"actual-protocol-failure\"";
        var arguments = string.Concat("[", Last.AsyncHandle.ToString(CultureInfo.InvariantCulture), success ? ",true," : ",false,", payload, "]");
        DotNetDispatcher.EndInvokeJS(this, arguments);
    }

    public void ValidateDispatch(CallOperation operation)
    {
        var callType = operation switch
        {
            CallOperation.Constructor => JSCallType.ConstructorCall,
            CallOperation.Get => JSCallType.GetValue,
            CallOperation.Set => JSCallType.SetValue,
            _ => JSCallType.FunctionCall
        };
        var resultType = operation switch
        {
            CallOperation.Constructor => JSCallResultType.JSObjectReference,
            CallOperation.InvokeVoid => JSCallResultType.JSVoidResult,
            _ => JSCallResultType.Default
        };
        var arguments = operation switch
        {
            CallOperation.Get => "[]",
            CallOperation.Set => "[\"assigned-value\"]",
            _ => "[123,\"actual-argument\"]"
        };
        Require(Last.AsyncHandle > 0 && Last.TargetInstanceId == TargetId && Last.Identifier == Calls.Identifier
            && Last.CallType == callType && Last.ResultType == resultType && Last.ArgsJson == arguments,
            "Actual runtime dispatch changed its handle, target, identifier, type or arguments.");
    }

    public static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}

internal sealed class DispatchFailure : Exception
{
}

internal static class Calls
{
    public const string Identifier = "actual.member";
    public static readonly TimeSpan LongDeadline = TimeSpan.FromMinutes(5);

    public static Task Start(CallOperation operation, IJSObjectReference reference, TimeSpan timeout) => operation switch
    {
        CallOperation.Invoke => reference.InvokeAsync<int>(Identifier, timeout, RuntimeBoundary.Arguments).AsTask(),
        CallOperation.InvokeVoid => reference.InvokeVoidAsync(Identifier, timeout, RuntimeBoundary.Arguments).AsTask(),
        CallOperation.Constructor => reference.InvokeConstructorAsync(Identifier, timeout, RuntimeBoundary.Arguments).AsTask(),
        CallOperation.Get => reference.GetValueAsync<int>(Identifier, timeout).AsTask(),
        CallOperation.Set => reference.SetValueAsync(Identifier, "assigned-value", timeout).AsTask(),
        _ => throw new ArgumentOutOfRangeException(nameof(operation))
    };

    public static Task StartDefault(CallOperation operation, IJSObjectReference reference) => operation switch
    {
        CallOperation.Invoke => reference.InvokeAsync<int>(Identifier, RuntimeBoundary.Arguments).AsTask(),
        CallOperation.InvokeVoid => reference.InvokeVoidAsync(Identifier, RuntimeBoundary.Arguments).AsTask(),
        CallOperation.Constructor => reference.InvokeConstructorAsync(Identifier, RuntimeBoundary.Arguments).AsTask(),
        CallOperation.Get => reference.GetValueAsync<int>(Identifier).AsTask(),
        CallOperation.Set => reference.SetValueAsync(Identifier, "assigned-value").AsTask(),
        _ => throw new ArgumentOutOfRangeException(nameof(operation))
    };

    public static int Run(CallOperation operation, TimeoutPolicy policy, ReplyTiming reply, RuntimeBoundary runtime, IJSObjectReference reference)
    {
        var timeout = policy == TimeoutPolicy.Finite ? LongDeadline : Timeout.InfiniteTimeSpan;
        var task = Start(operation, reference, timeout);
        if (reply == ReplyTiming.Deferred)
        {
            runtime.Complete();
        }
        task.GetAwaiter().GetResult();

        return operation switch
        {
            CallOperation.Invoke or CallOperation.Get => ((Task<int>)task).Result,
            CallOperation.Constructor => ((Task<IJSObjectReference>)task).Result is JSObjectReference ? RuntimeBoundary.Result : -1,
            _ => runtime.DispatchCount > 0 ? RuntimeBoundary.Result : -1
        };
    }
}

// An observing public consumer still delegates every operation to the real reference.
internal sealed class RetainingReference(IJSObjectReference actual) : IJSObjectReference
{
    public CancellationToken LastToken { get; private set; }
    public ValueTask<T> InvokeAsync<T>(string identifier, object?[]? args) => actual.InvokeAsync<T>(identifier, args);
    public ValueTask<T> InvokeAsync<T>(string identifier, CancellationToken token, object?[]? args)
    {
        LastToken = token;
        return actual.InvokeAsync<T>(identifier, token, args);
    }
    public ValueTask<IJSObjectReference> InvokeConstructorAsync(string identifier, object?[]? args) => actual.InvokeConstructorAsync(identifier, args);
    public ValueTask<IJSObjectReference> InvokeConstructorAsync(string identifier, CancellationToken token, object?[]? args)
    {
        LastToken = token;
        return actual.InvokeConstructorAsync(identifier, token, args);
    }
    public ValueTask<T> GetValueAsync<T>(string identifier) => actual.GetValueAsync<T>(identifier);
    public ValueTask<T> GetValueAsync<T>(string identifier, CancellationToken token)
    {
        LastToken = token;
        return actual.GetValueAsync<T>(identifier, token);
    }
    public ValueTask SetValueAsync<T>(string identifier, T value) => actual.SetValueAsync(identifier, value);
    public ValueTask SetValueAsync<T>(string identifier, T value, CancellationToken token)
    {
        LastToken = token;
        return actual.SetValueAsync(identifier, value, token);
    }
    public ValueTask DisposeAsync() => actual.DisposeAsync();
}
