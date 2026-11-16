using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text.Json.Serialization;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Infrastructure;

namespace AutoPerf;

internal sealed record ResourceRow(CallOperation Operation, TimeoutPolicy Policy, int Calls, long Bytes, double BytesPerCall, int Checksum);
internal sealed record Observation(string Name, object Detail);
internal sealed record ProbeReport(List<Observation> Observations, List<ResourceRow> Resources, List<ResourceRow> ColdResources, object Summary, bool ReuseObjectivePassed);

internal static class RuntimeProbe
{
    private static readonly TimeSpan Deadline = TimeSpan.FromMilliseconds(100);
    private static readonly TimeSpan ObservationBoundary = TimeSpan.FromMilliseconds(600);
    private static readonly TimeSpan Watchdog = TimeSpan.FromSeconds(5);

    public static async Task<ProbeReport> VerifyAsync()
    {
        var rows = new List<Observation>();
        var resources = new List<ResourceRow>();
        var coldResources = new List<ResourceRow>();
        foreach (var operation in Enum.GetValues<CallOperation>())
        {
            for (var repeat = 1; repeat <= 3; repeat++)
            {
                using var runtime = new RuntimeBoundary(Deadline);
                var task = Calls.StartAsync(operation, runtime).AsTask();
                var call = runtime.Last;
                runtime.Validate(call, operation, objectTarget: false);
                var token = await RequireCanceled(task);
                runtime.Complete(call);
                RuntimeBoundary.Require(task.IsCanceled && token.CanBeCanceled && token.IsCancellationRequested,
                    "Real deadline token/task or late-reply cancellation state differs.");
                rows.Add(new($"DefaultDeadline_CancelsPending{operation}", new
                {
                    repeat,
                    call.AsyncHandle,
                    taskCanceled = task.IsCanceled,
                    tokenCanBeCanceled = token.CanBeCanceled,
                    tokenRequested = token.IsCancellationRequested,
                    lateReplyLeavesCanceled = true
                }));
            }

            using (var runtime = new RuntimeBoundary(Deadline))
            {
                var defaultTask = Calls.StartAsync(operation, runtime).AsTask();
                var defaultCall = runtime.Last;
                var noneTask = Calls.StartAsync(operation, runtime, explicitNone: true).AsTask();
                var noneCall = runtime.Last;
                await RequireCanceled(defaultTask);
                RuntimeBoundary.Require(!noneTask.IsCompleted, "Explicit None did not override the actual default producer.");
                runtime.Complete(noneCall);
                var result = await noneTask.WaitAsync(Watchdog);
                RuntimeBoundary.Require(result == RuntimeBoundary.Result, "Explicit None actual result differs.");
                rows.Add(new($"DefaultVsExplicitNone_{operation}", new
                {
                    defaultHandle = defaultCall.AsyncHandle,
                    overrideHandle = noneCall.AsyncHandle,
                    defaultCanceled = defaultTask.IsCanceled,
                    overrideWasPending = true,
                    result
                }));
            }

            foreach (var policy in new[] { TimeoutPolicy.Infinite, TimeoutPolicy.Unconfigured })
            {
                using var runtime = new RuntimeBoundary(Calls.TimeoutFor(policy));
                var task = Calls.StartAsync(operation, runtime).AsTask();
                var call = runtime.Last;
                await ObserveBoundary();
                RuntimeBoundary.Require(!task.IsCompleted, "No-deadline default unexpectedly completed or canceled.");
                runtime.Complete(call);
                var result = await task.WaitAsync(Watchdog);
                RuntimeBoundary.Require(result == RuntimeBoundary.Result, "No-deadline default actual result differs.");
                rows.Add(new($"PendingDefault_{operation}_{policy}", new { call.AsyncHandle, pendingBeyondFiniteDeadline = true, result }));
            }

            using (var runtime = new RuntimeBoundary(Calls.LongDeadline) { CompleteInline = true })
            {
                RuntimeBoundary.Require(Calls.Run(operation, Workload.WindowInline, runtime) == RuntimeBoundary.Result, "Warm call failed.");
                var before = runtime.DispatchCount;
                runtime.DefaultTimeout = TimeSpan.Zero;
                runtime.CompleteInline = false;
                var task = Calls.StartAsync(operation, runtime).AsTask();
                RuntimeBoundary.Require(task.IsCanceled && runtime.DispatchCount == before,
                    "Exact zero default must cancel synchronously before transport dispatch, even after success.");
                await RequireCanceled(task);
                rows.Add(new($"ZeroDefault_NoDispatchAfterCompleted{operation}", new
                {
                    completedDispatches = before,
                    laterDispatches = runtime.DispatchCount,
                    canceledBeforeReturn = true
                }));
            }

            using (var runtime = new RuntimeBoundary(Deadline) { CompleteInline = true })
            {
                Calls.Run(operation, Workload.WindowInline, runtime);
                runtime.DefaultTimeout = Timeout.InfiniteTimeSpan;
                runtime.CompleteInline = false;
                var task = Calls.StartAsync(operation, runtime).AsTask();
                var call = runtime.Last;
                await ObserveBoundary();
                RuntimeBoundary.Require(!task.IsCompleted, "An earlier successful request's timer affected later infinite work.");
                runtime.Complete(call);
                RuntimeBoundary.Require(await task.WaitAsync(Watchdog) == RuntimeBoundary.Result, "Later actual reply result differs.");
                rows.Add(new($"EarlierDeadlineCannotCancelLaterInfinite_{operation}", new { call.AsyncHandle, survivedEarlierDeadline = true }));
            }

            using (var runtime = new RuntimeBoundary(Deadline))
            {
                var first = await RequireCanceled(Calls.StartAsync(operation, runtime).AsTask());
                runtime.DefaultTimeout = Calls.LongDeadline;
                runtime.CompleteInline = true;
                Calls.Run(operation, Workload.WindowInline, runtime);
                runtime.DefaultTimeout = Deadline;
                runtime.CompleteInline = false;
                var second = await RequireCanceled(Calls.StartAsync(operation, runtime).AsTask());
                RuntimeBoundary.Require(first.IsCancellationRequested && second.IsCancellationRequested && first != second,
                    "A previously exposed canceled token changed or was reused.");
                rows.Add(new($"CanceledDefaultTokenNeverReused_{operation}", new { oldRequested = true, newRequested = true, tokensDistinct = true }));
            }

            foreach (var policy in Enum.GetValues<TimeoutPolicy>())
            {
                using var runtime = new RuntimeBoundary(Calls.TimeoutFor(policy)) { CompleteInline = true };
                Measure(operation, policy, runtime, 5000);
                var resource = Measure(operation, policy, runtime, 5000);
                RuntimeBoundary.Require(resource.Checksum == 5000 * RuntimeBoundary.Result, "Measured resource result checksum differs.");
                resources.Add(resource);
                var coldStart = GC.GetAllocatedBytesForCurrentThread();
                var coldSum = 0;
                for (var repeat = 0; repeat < 20; repeat++)
                {
                    using var fresh = new RuntimeBoundary(Calls.TimeoutFor(policy)) { CompleteInline = true };
                    coldSum += Calls.Run(operation, Workload.WindowInline, fresh);
                }
                var coldBytes = GC.GetAllocatedBytesForCurrentThread() - coldStart;
                RuntimeBoundary.Require(coldSum == 20 * RuntimeBoundary.Result, "Fresh-runtime resource checksum differs.");
                coldResources.Add(new ResourceRow(operation, policy, 20, coldBytes, (double)coldBytes / 20, coldSum));
            }
        }

        using (var runtime = new RuntimeBoundary(Deadline))
        {
            var tasks = new Task<int>[8];
            var calls = new JSInvocationInfo[8];
            for (var index = 0; index < tasks.Length; index++)
            {
                tasks[index] = Calls.StartAsync(CallOperation.Invoke, runtime).AsTask();
                RuntimeBoundary.Require(!tasks[index].IsCompleted, "Overlap request did not reach pending producer.");
                calls[index] = runtime.Last;
            }
            runtime.Complete(calls[0]);
            RuntimeBoundary.Require(await tasks[0].WaitAsync(Watchdog) == RuntimeBoundary.Result, "Selected overlap success differs.");
            var tokens = new List<CancellationToken>();
            for (var index = 1; index < tasks.Length; index++)
            {
                tokens.Add(await RequireCanceled(tasks[index]));
                runtime.Complete(calls[index]);
                RuntimeBoundary.Require(tasks[index].IsCanceled, "Late overlap reply changed cancellation.");
            }
            RuntimeBoundary.Require(tokens.Distinct().Count() == 7 && calls.Select(call => call.AsyncHandle).Distinct().Count() == 8,
                "Overlapping request token/handle ownership differs.");
            rows.Add(new("OverlappingDefaults_IndependentDeadlines", new { pendingRequests = 8, successes = 1, realCancellations = 7, distinctCanceledTokens = 7 }));
        }

        using (var runtime = new RuntimeBoundary(Deadline))
        {
            var argument = new SerializationGate();
            var task = Task.Run(async () => await runtime.InvokeAsync<int>(Calls.Identifier, [argument]));
            try
            {
                await argument.Entered.Task.WaitAsync(Watchdog);
                await ObserveBoundary();
                RuntimeBoundary.Require(runtime.DispatchCount == 0, "Serialization gate must precede transport dispatch.");
            }
            finally
            {
                argument.Release.TrySetResult();
            }
            var token = await RequireCanceled(task);
            rows.Add(new("DefaultDeadline_CoversActualSerialization", new
            {
                getterReached = true,
                observedPastRealDeadlineBeforeRelease = true,
                taskCanceled = task.IsCanceled,
                tokenRequested = token.IsCancellationRequested,
                dispatchesAfterRelease = runtime.DispatchCount
            }));
        }

        rows.Add(await Error("InvalidDefaultTimeout", runtime => runtime.DefaultTimeout = TimeSpan.FromMilliseconds(-2),
            null, typeof(ArgumentOutOfRangeException), "delay"));
        rows.Add(await Error("ActualSerializationGetterFailure", null, [new ThrowingArgument()], typeof(InvalidOperationException), null));
        rows.Add(await Error("SynchronousPublicTransportFailure", runtime => runtime.ThrowOnDispatch = true, null, typeof(DispatchFailure), null));
        using (var runtime = new RuntimeBoundary(Calls.LongDeadline))
        {
            var task = runtime.InvokeAsync<int>(Calls.Identifier, RuntimeBoundary.Arguments).AsTask();
            var call = runtime.Last;
            runtime.Complete(call, success: false);
            var error = await RequireError(task, typeof(JSException));
            RuntimeBoundary.Require(error.Message == "actual-protocol-failure", "Actual protocol failure message differs.");
            rows.Add(new("ActualPublicProtocolFailure", new { errorType = error.GetType().FullName, error.Message, returnedTask = true }));
        }

        bool disposeShutdownObjective;
        using (var runtime = new RuntimeBoundary(Calls.LongDeadline) { CompleteInline = true })
        {
            var timersBefore = Timer.ActiveCount;
            Measure(CallOperation.Invoke, TimeoutPolicy.Finite, runtime, 5000);
            var warm = Measure(CallOperation.Invoke, TimeoutPolicy.Finite, runtime, 5000);
            var timersAfter = Timer.ActiveCount;
            RuntimeBoundary.Require(timersAfter == timersBefore, "Completed default calls retained an active timer.");
            runtime.CompleteInline = false;
            var pending = Calls.StartAsync(CallOperation.Invoke, runtime).AsTask();
            var call = runtime.Last;
            runtime.Dispose();
            RuntimeBoundary.Require(!pending.IsCompleted, "Dispose must not invent cancellation of an owned pending call.");
            runtime.Complete(call);
            RuntimeBoundary.Require(await pending.WaitAsync(Watchdog) == RuntimeBoundary.Result, "Owned call reply after Dispose differs.");
            runtime.CompleteInline = true;
            Measure(CallOperation.Invoke, TimeoutPolicy.Finite, runtime, 5000);
            var afterDispose = Measure(CallOperation.Invoke, TimeoutPolicy.Finite, runtime, 5000);
            disposeShutdownObjective = afterDispose.BytesPerCall - warm.BytesPerCall >= 200;
            rows.Add(new("Dispose_PreservesPendingAndPostDisposeBehavior", new
            {
                pendingSurvivedDispose = true,
                laterResult = RuntimeBoundary.Result,
                warmBytesPerCall = warm.BytesPerCall,
                afterDisposeBytesPerCall = afterDispose.BytesPerCall,
                activeTimersBefore = timersBefore,
                activeTimersAfterWarmCalls = timersAfter,
                reuseShutdownResourceObjective = disposeShutdownObjective
            }));
        }
        var weak = CreateReleasedRuntime();
        for (var repeat = 0; repeat < 3 && weak.IsAlive; repeat++)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
        }
        RuntimeBoundary.Require(!weak.IsAlive, "Inactive completed default timer unexpectedly rooted released runtime.");
        rows.Add(new("CompletedDefaultRuntime_IsCollectable", new { collected = true }));
        var warmObjective = Enum.GetValues<CallOperation>().All(operation =>
            resources.Single(row => row.Operation == operation && row.Policy == TimeoutPolicy.Finite).BytesPerCall
            - resources.Single(row => row.Operation == operation && row.Policy == TimeoutPolicy.Unconfigured).BytesPerCall < 100);
        var reuseObjective = warmObjective && disposeShutdownObjective;

        return new ProbeReport(rows, resources, coldResources, new
        {
            semanticObservations = rows.Count,
            finiteDeadlineRows = 15,
            overridePairs = 5,
            zeroNoDispatchRows = 5,
            earlierDeadlineControls = 5,
            retainedCanceledTokenControls = 5,
            resourceBatches = resources.Count,
            freshRuntimeResourceBatches = coldResources.Count,
            warmReuseAllocationObjective = warmObjective,
            disposeShutdownObjective,
            reuseObjective,
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId
        }, reuseObjective);
    }

    private static ResourceRow Measure(CallOperation operation, TimeoutPolicy policy, RuntimeBoundary runtime, int count)
    {
        var start = GC.GetAllocatedBytesForCurrentThread();
        var sum = 0;
        for (var index = 0; index < count; index++)
        {
            sum += Calls.Run(operation, Workload.WindowInline, runtime);
        }
        var bytes = GC.GetAllocatedBytesForCurrentThread() - start;

        return new ResourceRow(operation, policy, count, bytes, (double)bytes / count, sum);
    }

    private static async Task<CancellationToken> RequireCanceled(Task task)
    {
        try
        {
            await task.WaitAsync(Watchdog);
        }
        catch (TaskCanceledException error)
        {
            RuntimeBoundary.Require(task.IsCanceled && error.CancellationToken.CanBeCanceled && error.CancellationToken.IsCancellationRequested,
                "Actual pending request cancellation/token differs.");
            return error.CancellationToken;
        }
        throw new InvalidOperationException("Real default deadline did not cancel the pending request.");
    }

    private static async Task<Observation> Error(string name, Action<RuntimeBoundary>? configure,
        object?[]? args, Type expected, string? parameter)
    {
        using var runtime = new RuntimeBoundary(Calls.LongDeadline);
        configure?.Invoke(runtime);
        var task = runtime.InvokeAsync<int>(Calls.Identifier, args ?? RuntimeBoundary.Arguments).AsTask();
        var error = await RequireError(task, expected);
        RuntimeBoundary.Require((error as ArgumentException)?.ParamName == parameter, "Actual error parameter differs.");

        return new Observation(name, new { errorType = error.GetType().FullName, error.Message, parameter, returnedTask = true });
    }

    private static async Task<Exception> RequireError(Task task, Type expected)
    {
        try
        {
            await task.WaitAsync(Watchdog);
        }
        catch (Exception error) when (error.GetType() == expected)
        {
            return error;
        }
        throw new InvalidOperationException("Actual owner did not surface the expected error.");
    }

    private static async Task ObserveBoundary()
    {
        var signal = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var start = Stopwatch.GetTimestamp();
        using var source = new CancellationTokenSource(ObservationBoundary);
        using var registration = source.Token.Register(() => signal.TrySetResult());
        await signal.Task.WaitAsync(Watchdog);
        RuntimeBoundary.Require(Stopwatch.GetElapsedTime(start) >= Deadline, "Real sentinel did not observe the finite deadline boundary.");
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static WeakReference CreateReleasedRuntime()
    {
        var runtime = new RuntimeBoundary(Calls.LongDeadline) { CompleteInline = true };
        RuntimeBoundary.Require(Calls.Run(CallOperation.Invoke, Workload.WindowInline, runtime) == RuntimeBoundary.Result, "Released-runtime call failed.");

        return new WeakReference(runtime);
    }

    private sealed class SerializationGate
    {
        [JsonIgnore]
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        [JsonIgnore]
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public int Value
        {
            get
            {
                Entered.TrySetResult();
                Release.Task.WaitAsync(Watchdog).GetAwaiter().GetResult();
                return 123;
            }
        }
    }

    private sealed class ThrowingArgument
    {
        public int Value => throw new InvalidOperationException("actual-serialization-getter-failure");
    }
}
