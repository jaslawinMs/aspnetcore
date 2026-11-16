using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Text.Json;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Implementation;
using Microsoft.JSInterop.Infrastructure;

namespace AutoPerf;

public enum CallOperation
{
    Invoke, InvokeVoid, Constructor, Get, Set
}

public enum Workload
{
    WindowInline, WindowDeferred, ObjectInline, ObjectDeferred, Overlap8
}

public enum TimeoutPolicy
{
    Finite, Unconfigured, Infinite
}

internal sealed class RuntimeBoundary : JSRuntime
{
    public const int Result = 731;
    public static readonly object?[] Arguments = [123, "actual-argument"];
    public IJSObjectReference Reference { get; }
    public bool CompleteInline { get; set; }
    public bool ThrowOnDispatch { get; set; }
    public JSInvocationInfo Last { get; private set; }
    public int DispatchCount { get; private set; }

    public TimeSpan? DefaultTimeout
    {
        get => DefaultAsyncTimeout;
        set => DefaultAsyncTimeout = value;
    }

    public RuntimeBoundary(TimeSpan? timeout)
    {
        DefaultAsyncTimeout = timeout;
        Reference = JsonSerializer.Deserialize<IJSObjectReference>("{\"__jsObjectId\":47}", JsonSerializerOptions)
            ?? throw new InvalidDataException("Actual JSRuntime converter returned null.");
        Require(Reference.GetType() == typeof(JSObjectReference), "Actual converter reference type differs.");
    }

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
            Complete(invocationInfo);
        }
    }

    protected override void BeginInvokeJS(long taskId, string identifier, [StringSyntax("Json")] string? argsJson, JSCallResultType resultType, long targetInstanceId)
    {
        throw new InvalidOperationException("Actual runtime must dispatch JSInvocationInfo.");
    }

    protected override void EndInvokeDotNet(DotNetInvocationInfo invocationInfo, in DotNetInvocationResult invocationResult)
    {
        throw new InvalidOperationException("This managed probe does not dispatch .NET invocations.");
    }

    public void Complete(in JSInvocationInfo call, bool success = true)
    {
        var payload = success
            ? call.ResultType == JSCallResultType.JSObjectReference ? "{\"__jsObjectId\":89}"
            : call.ResultType == JSCallResultType.JSVoidResult || call.CallType == JSCallType.SetValue ? "null" : "731"
            : "\"actual-protocol-failure\"";
        DotNetDispatcher.EndInvokeJS(this, string.Concat("[", call.AsyncHandle.ToString(CultureInfo.InvariantCulture),
            success ? ",true," : ",false,", payload, "]"));
    }

    public void Validate(in JSInvocationInfo call, CallOperation operation, bool objectTarget)
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
            CallOperation.Set when !objectTarget => JSCallResultType.JSVoidResult,
            _ => JSCallResultType.Default
        };
        var arguments = operation switch
        {
            CallOperation.Get => "[]",
            CallOperation.Set => "[\"assigned-value\"]",
            _ => "[123,\"actual-argument\"]"
        };
        Require(call.AsyncHandle > 0 && call.TargetInstanceId == (objectTarget ? 47 : 0)
            && call.Identifier == Calls.Identifier && call.CallType == callType
            && call.ResultType == resultType && call.ArgsJson == arguments,
            "Actual default-runtime protocol handle/target/type/result/arguments differs.");
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
    public static readonly TimeSpan LongDeadline = TimeSpan.FromSeconds(30);

    public static TimeSpan? TimeoutFor(TimeoutPolicy policy) => policy switch
    {
        TimeoutPolicy.Finite => LongDeadline,
        TimeoutPolicy.Infinite => Timeout.InfiniteTimeSpan,
        TimeoutPolicy.Unconfigured => null,
        _ => throw new ArgumentOutOfRangeException(nameof(policy))
    };

    public static async ValueTask<int> StartAsync(CallOperation operation, RuntimeBoundary runtime,
        bool objectTarget = false, bool explicitNone = false, object?[]? arguments = null)
    {
        arguments ??= RuntimeBoundary.Arguments;
        switch (operation)
        {
            case CallOperation.Invoke:
                var invoke = objectTarget
                    ? explicitNone ? runtime.Reference.InvokeAsync<int>(Identifier, CancellationToken.None, arguments)
                        : runtime.Reference.InvokeAsync<int>(Identifier, arguments)
                    : explicitNone ? runtime.InvokeAsync<int>(Identifier, CancellationToken.None, arguments)
                        : runtime.InvokeAsync<int>(Identifier, arguments);
                return await invoke;
            case CallOperation.Get:
                var get = objectTarget
                    ? explicitNone ? runtime.Reference.GetValueAsync<int>(Identifier, CancellationToken.None)
                        : runtime.Reference.GetValueAsync<int>(Identifier)
                    : explicitNone ? runtime.GetValueAsync<int>(Identifier, CancellationToken.None)
                        : runtime.GetValueAsync<int>(Identifier);
                return await get;
            case CallOperation.Constructor:
                var constructor = objectTarget
                    ? explicitNone ? runtime.Reference.InvokeConstructorAsync(Identifier, CancellationToken.None, arguments)
                        : runtime.Reference.InvokeConstructorAsync(Identifier, arguments)
                    : explicitNone ? runtime.InvokeConstructorAsync(Identifier, CancellationToken.None, arguments)
                        : runtime.InvokeConstructorAsync(Identifier, arguments);
                var reference = await constructor;
                RuntimeBoundary.Require(reference.GetType() == typeof(JSObjectReference), "Actual constructor result type differs.");
                return RuntimeBoundary.Result;
            case CallOperation.Set:
                var set = objectTarget
                    ? explicitNone ? runtime.Reference.SetValueAsync(Identifier, "assigned-value", CancellationToken.None)
                        : runtime.Reference.SetValueAsync(Identifier, "assigned-value")
                    : explicitNone ? runtime.SetValueAsync(Identifier, "assigned-value", CancellationToken.None)
                        : runtime.SetValueAsync(Identifier, "assigned-value");
                await set;
                return RuntimeBoundary.Result;
            case CallOperation.InvokeVoid:
                var invokeVoid = objectTarget
                    ? explicitNone ? runtime.Reference.InvokeVoidAsync(Identifier, CancellationToken.None, arguments)
                        : runtime.Reference.InvokeVoidAsync(Identifier, arguments)
                    : explicitNone ? runtime.InvokeVoidAsync(Identifier, CancellationToken.None, arguments)
                        : runtime.InvokeVoidAsync(Identifier, arguments);
                await invokeVoid;
                return RuntimeBoundary.Result;
            default:
                throw new ArgumentOutOfRangeException(nameof(operation));
        }
    }

    public static int Run(CallOperation operation, Workload workload, RuntimeBoundary runtime)
    {
        var objectTarget = workload is Workload.ObjectInline or Workload.ObjectDeferred;
        if (workload == Workload.Overlap8)
        {
            var tasks = new Task<int>[8];
            var calls = new JSInvocationInfo[8];
            for (var i = 0; i < tasks.Length; i++)
            {
                tasks[i] = StartAsync(operation, runtime).AsTask();
                RuntimeBoundary.Require(!tasks[i].IsCompleted, "Overlap requires genuinely pending producer calls.");
                calls[i] = runtime.Last;
            }
            var sum = 0;
            for (var i = 0; i < tasks.Length; i++)
            {
                runtime.Complete(calls[i]);
                sum += tasks[i].GetAwaiter().GetResult();
            }

            return sum;
        }

        var value = StartAsync(operation, runtime, objectTarget);
        if (workload is Workload.WindowDeferred or Workload.ObjectDeferred)
        {
            RuntimeBoundary.Require(!value.IsCompleted, "Deferred call must be pending before actual public reply.");
            runtime.Complete(runtime.Last);
        }
        RuntimeBoundary.Require(value.IsCompletedSuccessfully, "Actual public reply did not complete the request.");

        return value.GetAwaiter().GetResult();
    }
}
