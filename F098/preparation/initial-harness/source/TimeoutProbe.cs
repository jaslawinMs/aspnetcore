using System.Diagnostics;
using System.Text.Json.Serialization;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Infrastructure;

namespace AutoPerf;

internal sealed record Observation(string Name, object Detail);
internal sealed record ResourceRow(string Workload, TimeoutPolicy Policy, int Calls, long Bytes, double BytesPerCall, int Checksum);
internal sealed record GenericReuseObservation(string Name, bool ActualOriginalRetainedTokenCanceled, bool ActualReusedRetainedTokenCanceled,
    bool ActualLaterCallCanceled, bool ActualResetSucceeded, bool IsShippingCandidate, bool IsBenchmarkSpeedup, bool GenericReuseEquivalent);
internal sealed record ProbeReport(List<Observation> Observations, List<ResourceRow> Resources, List<ResourceRow> FreshRuntimeResources, GenericReuseObservation GenericReuseControl);

internal static class TimeoutProbe
{
    public static async Task<ProbeReport> VerifyAsync()
    {
        var observations = new List<Observation>();
        for (var repetition = 1; repetition <= 3; repetition++)
        {
            using var runtime = new RuntimeBoundary();
            var consumer = new RetainingRuntime(runtime);
            var watch = Stopwatch.StartNew();
            var task = JSRuntimeExtensions.InvokeAsync<int>(consumer, RuntimeBoundary.Identifier,
                TimeSpan.FromMilliseconds(100), RuntimeBoundary.Arguments).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted, "Actual finite call did not reach its pending producer.");
            runtime.Validate(runtime.Last);
            var token = consumer.LastToken;
            await SentinelAsync();
            RuntimeBoundary.Require(watch.Elapsed.TotalMilliseconds >= 100 && token.CanBeCanceled && task.IsCanceled,
                "Real finite timer did not cancel the actual public operation.");
            await RequireCancellationAsync(task, token);
            runtime.Complete(runtime.Last);
            RuntimeBoundary.Require(task.IsCanceled, "Late public reply changed cancellation.");
            observations.Add(new("FiniteTimeout_CancelsActualPendingInvoke", new { repetition, elapsedMilliseconds = watch.Elapsed.TotalMilliseconds,
                requested = token.IsCancellationRequested, actualExceptionTokenMatched = true, lateReplyPreservedCancellation = true }));
        }
        foreach (var policy in new[] { TimeoutPolicy.Infinite, TimeoutPolicy.ExplicitNone })
        {
            using var defaultRuntime = new RuntimeBoundary(TimeSpan.FromMilliseconds(100));
            using var overrideRuntime = new RuntimeBoundary(TimeSpan.FromMilliseconds(100));
            var consumer = new RetainingRuntime(overrideRuntime);
            var ordinary = defaultRuntime.InvokeAsync<int>(RuntimeBoundary.Identifier, RuntimeBoundary.Arguments).AsTask();
            var overridden = RuntimeBoundary.Start(consumer, policy).AsTask();
            RuntimeBoundary.Require(!ordinary.IsCompleted && !overridden.IsCompleted, "Default/override comparison did not produce both pending calls.");
            defaultRuntime.Validate(defaultRuntime.Last);
            overrideRuntime.Validate(overrideRuntime.Last);
            await SentinelAsync();
            RuntimeBoundary.Require(ordinary.IsCanceled && !overridden.IsCompleted && consumer.LastToken == CancellationToken.None,
                "Explicit timeout override inherited the configured default or did not use None.");
            await RequireCancellationAsync(ordinary);
            defaultRuntime.Complete(defaultRuntime.Last);
            overrideRuntime.Complete(overrideRuntime.Last);
            RuntimeBoundary.Require(await overridden == RuntimeBoundary.Result, "Public override reply value differs.");
            observations.Add(new($"ExplicitOverride_DoesNotInheritDefault_{policy}",
                new { actualDefaultCanceled = true, overridePendingPastDefault = true, tokenIsNone = true, result = RuntimeBoundary.Result }));
        }
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var zero = JSRuntimeExtensions.InvokeAsync<int>(consumer, RuntimeBoundary.Identifier, TimeSpan.Zero, RuntimeBoundary.Arguments).AsTask();
            RuntimeBoundary.Require(consumer.RequestedAtEntry && consumer.LastToken.CanBeCanceled && zero.IsCanceled && runtime.DispatchCount == 0,
                "Exact zero did not synchronously enter the consumer canceled and suppress actual dispatch.");
            await RequireCancellationAsync(zero, consumer.LastToken);
            observations.Add(new("ZeroTimeout_IsCanceledAtPublicConsumerEntry", new { requestedBeforeDispatch = true, dispatches = 0 }));
        }
        foreach (var policy in Enum.GetValues<TimeoutPolicy>())
        {
            using var runtime = new RuntimeBoundary();
            var consumer = new RetainingRuntime(runtime);
            var before = Timer.ActiveCount;
            var task = RuntimeBoundary.Start(consumer, policy).AsTask();
            var pending = Timer.ActiveCount;
            RuntimeBoundary.Require(!task.IsCompleted && consumer.LastToken.CanBeCanceled == (policy == TimeoutPolicy.Finite) &&
                pending == before + (policy == TimeoutPolicy.Finite ? 1 : 0), "Actual pending timer/token lifetime differs.");
            runtime.Complete(runtime.Last);
            RuntimeBoundary.Require(await task == RuntimeBoundary.Result && Timer.ActiveCount == before,
                "Actual operation failed or kept its active deadline timer after completion.");
            observations.Add(new($"ActualTimerLifetime_{policy}", new { before, pending, after = Timer.ActiveCount,
                tokenCanBeCanceled = consumer.LastToken.CanBeCanceled, tokenIsNone = consumer.LastToken == CancellationToken.None }));
        }
        await ObserveErrorsAsync(observations);
        await ObserveSerializationDeadlineAsync(observations);
        await ObserveOverlapAsync(observations);
        await ObserveDisposeAsync(observations);
        await ObserveCompletedRetentionAsync(observations);
        var reuse = await ObserveGenericReuseAsync();

        return new(observations, MeasureResources(fresh: false), MeasureResources(fresh: true), reuse);
    }

    private static async Task SentinelAsync()
    {
        var reached = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var timer = new Timer(state => ((TaskCompletionSource)state!).SetResult(), reached,
            TimeSpan.FromMilliseconds(600), Timeout.InfiniteTimeSpan);
        await reached.Task.WaitAsync(TimeSpan.FromSeconds(5));
    }

    private static async Task RequireCancellationAsync(Task task, CancellationToken? expected = null)
    {
        try
        {
            await task.WaitAsync(TimeSpan.FromSeconds(5));
        }
        catch (TaskCanceledException error)
        {
            RuntimeBoundary.Require(task.IsCanceled && error.CancellationToken.IsCancellationRequested &&
                (!expected.HasValue || error.CancellationToken == expected.Value), "Cancellation came from the watchdog or a different token.");

            return;
        }

        throw new InvalidOperationException("Actual owner operation did not cancel.");
    }

    private static async Task ObserveErrorsAsync(List<Observation> observations)
    {
        await CaptureErrorAsync(observations, "NullRuntime_OriginalReturnedTaskError",
            () => JSRuntimeExtensions.InvokeAsync<int>(null!, RuntimeBoundary.Identifier, RuntimeBoundary.LongDeadline).AsTask(),
            typeof(ArgumentNullException), "jsRuntime");
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        await CaptureErrorAsync(observations, "InvalidTimeout_OriginalReturnedTaskError",
            () => JSRuntimeExtensions.InvokeAsync<int>(runtime, RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(-2)).AsTask(),
            typeof(ArgumentOutOfRangeException), "delay");
        await CaptureErrorAsync(observations, "ActualSerializationGetterFailure",
            () => RuntimeBoundary.Start(runtime, TimeoutPolicy.Finite, [new ThrowingArgument()]).AsTask(), typeof(InvalidOperationException));
        using var failing = new RuntimeBoundary { ThrowOnDispatch = true };
        await CaptureErrorAsync(observations, "SynchronousPublicTransportFailure",
            () => RuntimeBoundary.Start(failing, TimeoutPolicy.Finite).AsTask(), typeof(DispatchFailure));
        using var protocol = new RuntimeBoundary();
        await CaptureErrorAsync(observations, "ActualPublicProtocolFailure", () =>
        {
            var task = RuntimeBoundary.Start(protocol, TimeoutPolicy.Finite).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted, "Protocol failure needs an actual pending request.");
            protocol.Validate(protocol.Last);
            protocol.Complete(protocol.Last, success: false);

            return task;
        }, typeof(JSException));
    }

    private static async Task CaptureErrorAsync(List<Observation> observations, string name, Func<Task> start, Type expected, string? parameter = null)
    {
        var before = Timer.ActiveCount;
        var task = start();
        try
        {
            await task;
        }
        catch (Exception error) when (error.GetType() == expected)
        {
            RuntimeBoundary.Require((error as ArgumentException)?.ParamName == parameter && Timer.ActiveCount == before,
                "Original error parameter or timer cleanup differs.");
            observations.Add(new(name, new { exceptionType = error.GetType().FullName, error.Message, parameter, returnedTask = true, activeTimerCountRestored = true }));

            return;
        }

        throw new InvalidOperationException($"{name} did not raise its expected error.");
    }

    private static async Task ObserveSerializationDeadlineAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary();
        var gate = new GatedArgument();
        var invocation = Task.Run(async () => await JSRuntimeExtensions.InvokeAsync<int>(runtime, RuntimeBoundary.Identifier,
            TimeSpan.FromMilliseconds(100), gate));
        await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await SentinelAsync();
        gate.Release.SetResult();
        await RequireCancellationAsync(invocation);
        observations.Add(new("ExplicitDeadline_CoversActualSerialization",
            new { getterEntered = true, heldBeyondActualDeadline = true, publicTaskCanceled = true, runtime.DispatchCount }));
        runtime.Complete(runtime.Last);
    }

    private static async Task ObserveOverlapAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary();
        var consumer = new RetainingRuntime(runtime);
        var tasks = new Task<int>[8];
        var calls = new JSInvocationInfo[8];
        var tokens = new CancellationToken[8];
        for (var i = 0; i < tasks.Length; i++)
        {
            tasks[i] = JSRuntimeExtensions.InvokeAsync<int>(consumer, RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(100), RuntimeBoundary.Arguments).AsTask();
            RuntimeBoundary.Require(!tasks[i].IsCompleted, "Every overlap request must reach the actual pending producer.");
            calls[i] = runtime.Last;
            tokens[i] = consumer.LastToken;
            runtime.Validate(calls[i]);
        }
        RuntimeBoundary.Require(tokens.Distinct().Count() == 8, "Overlap timeout tokens are not independently owned.");
        runtime.Complete(calls[0]);
        RuntimeBoundary.Require(await tasks[0] == RuntimeBoundary.Result, "First public overlap reply differs.");
        await SentinelAsync();
        for (var i = 1; i < tasks.Length; i++)
        {
            await RequireCancellationAsync(tasks[i], tokens[i]);
            runtime.Complete(calls[i]);
        }
        RuntimeBoundary.Require(!tokens[0].IsCancellationRequested && tokens.Skip(1).All(token => token.IsCancellationRequested),
            "Canceled overlap requests changed the earlier successful token.");
        observations.Add(new("OverlappingExplicitCalls_IndependentTokensAndDeadlines",
            new { pendingRequests = 8, distinctTokens = 8, success = 1, realCancellations = 7, successfulTokenNeverCanceled = true }));
    }

    private static async Task ObserveDisposeAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary();
        var task = RuntimeBoundary.Start(runtime, TimeoutPolicy.Finite).AsTask();
        RuntimeBoundary.Require(!task.IsCompleted, "Dispose probe did not reach pending work.");
        runtime.Dispose();
        RuntimeBoundary.Require(!task.IsCompleted, "Runtime disposal changed ownership of the explicit timeout operation.");
        runtime.Complete(runtime.Last);
        RuntimeBoundary.Require(await task == RuntimeBoundary.Result, "Leased operation could not complete after Dispose.");
        observations.Add(new("RuntimeDispose_PreservesPendingExplicitCall", new { pendingSurvivedDispose = true, result = RuntimeBoundary.Result }));
    }

    private static async Task ObserveCompletedRetentionAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        var consumer = new RetainingRuntime(runtime);
        RuntimeBoundary.Require(await RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite) == RuntimeBoundary.Result, "Original first call did not succeed.");
        var earlier = consumer.LastToken;
        runtime.CompleteInline = false;
        var later = JSRuntimeExtensions.InvokeAsync<int>(consumer, RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(100), RuntimeBoundary.Arguments).AsTask();
        var laterToken = consumer.LastToken;
        await RequireCancellationAsync(later, laterToken);
        RuntimeBoundary.Require(earlier.CanBeCanceled && !earlier.IsCancellationRequested && earlier != laterToken,
            "Actual later deadline changed a previously completed consumer's token.");
        runtime.Complete(runtime.Last);
        observations.Add(new("OriginalCompletedConsumerToken_RemainsUncanceledAfterLaterDeadline",
            new { earlierCanBeCanceled = true, earlierRequested = false, laterRequested = true, tokensDistinct = true }));
    }

    private static async Task<GenericReuseObservation> ObserveGenericReuseAsync()
    {
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        var consumer = new RetainingRuntime(runtime);
        await RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite);
        var original = consumer.LastToken;
        using var source = new CancellationTokenSource(RuntimeBoundary.LongDeadline);
        await JSRuntimeExtensions.InvokeAsync<int>(consumer, RuntimeBoundary.Identifier, source.Token, RuntimeBoundary.Arguments);
        var retained = consumer.LastToken;
        RuntimeBoundary.Require(source.TryReset(), "Real completed source could not be reset for the public control.");
        runtime.CompleteInline = false;
        source.CancelAfter(TimeSpan.FromMilliseconds(100));
        var later = JSRuntimeExtensions.InvokeAsync<int>(consumer, RuntimeBoundary.Identifier, source.Token, RuntimeBoundary.Arguments).AsTask();
        await RequireCancellationAsync(later, retained);
        runtime.Complete(runtime.Last);
        RuntimeBoundary.Require(!original.IsCancellationRequested && retained.IsCancellationRequested && retained == consumer.LastToken,
            "Public reset/reuse counterexample did not distinguish original token lifetime.");

        return new("GenericTryResetReuse_ChangesPreviouslyCompletedPublicConsumerToken", false, true, true, true, false, false, false);
    }

    private static List<ResourceRow> MeasureResources(bool fresh)
    {
        var rows = new List<ResourceRow>();
        foreach (var policy in Enum.GetValues<TimeoutPolicy>())
        {
            using var runtime = new RuntimeBoundary { CompleteInline = true };
            for (var i = 0; i < 200; i++)
            {
                RuntimeBoundary.Require(RuntimeBoundary.Run(runtime, policy, ReplyWorkload.Inline) == RuntimeBoundary.Result, "Resource warmup value differs.");
            }
            var calls = fresh ? 20 : 5000;
            var checksum = 0;
            var before = GC.GetAllocatedBytesForCurrentThread();
            for (var i = 0; i < calls; i++)
            {
                if (fresh)
                {
                    using var next = new RuntimeBoundary { CompleteInline = true };
                    checksum += RuntimeBoundary.Run(next, policy, ReplyWorkload.Inline);
                }
                else
                {
                    checksum += RuntimeBoundary.Run(runtime, policy, ReplyWorkload.Inline);
                }
            }
            var bytes = GC.GetAllocatedBytesForCurrentThread() - before;
            RuntimeBoundary.Require(checksum == calls * RuntimeBoundary.Result, "Resource calls did not all reach the asserted public value.");
            rows.Add(new(fresh ? "FreshRuntimeIncludingSerializer" : "WarmActualPublicOwner", policy, calls, bytes, (double)bytes / calls, checksum));
        }

        return rows;
    }

    private sealed class ThrowingArgument
    {
        public int Value => throw new InvalidOperationException("actual-serialization-getter-failure");
    }

    private sealed class GatedArgument
    {
        [JsonIgnore]
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        [JsonIgnore]
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public int Value
        {
            get
            {
                Entered.SetResult();
                Release.Task.GetAwaiter().GetResult();

                return 123;
            }
        }
    }
}
