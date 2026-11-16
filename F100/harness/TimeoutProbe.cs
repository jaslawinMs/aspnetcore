using System.Diagnostics;
using System.Text.Json.Serialization;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Infrastructure;

namespace AutoPerf;

internal sealed record Observation(string Name, object Detail);
internal sealed record ResourceRow(string Workload, TimeoutPolicy Policy, int Calls, long Bytes, double BytesPerCall, int SuccessfullyConstructedReferences);
internal sealed record GenericReuseObservation(string Name, bool ActualOriginalRetainedTokenCanceled, bool ActualReusedRetainedTokenCanceled,
    bool ActualLaterCallCanceled, bool ActualResetSucceeded, bool IsShippingCandidate, bool IsBenchmarkSpeedup, bool GenericReuseEquivalent);
internal sealed record ProbeReport(List<Observation> Observations, List<ResourceRow> Resources, List<ResourceRow> FreshRuntimeResources,
    int OriginalConstructorDeadlineFailures, GenericReuseObservation GenericReuseControl);

internal static class TimeoutProbe
{
    public static async Task<ProbeReport> CharacterizeAsync()
    {
        var observations = new List<Observation>();
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var task = RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite).AsTask();
            var resultType = consumer.LastResultType ?? throw new InvalidOperationException("Actual constructor result type missing.");
            RuntimeBoundary.Require(!task.IsCompleted && resultType == typeof(IJSObjectReference),
                "Actual public constructor did not reach the pending owning reference producer.");
            runtime.ValidateConstructor(runtime.Last);
            runtime.Complete(runtime.Last);
            var reference = await task;
            RuntimeBoundary.RequireReference(reference);
            var material = runtime.VerifyMaterialReference(reference);
            observations.Add(new("ActualConstructor_ConvertedReferenceDispatchesMaterialTarget", new
            {
                underlyingResultType = resultType.FullName,
                actualReturnedType = reference.GetType().FullName,
                referenceOwnerSha256 = Evidence.Hash(reference.GetType().Assembly.Location),
                actualProtocolResult = "{\"__jsObjectId\":47}",
                materialTarget = runtime.Last.TargetInstanceId,
                materialValue = material
            }));
        }
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var task = JSRuntimeExtensions.InvokeAsync<int>(consumer, RuntimeBoundary.Identifier,
                RuntimeBoundary.LongDeadline, RuntimeBoundary.Arguments).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted && consumer.LastResultType == typeof(int) &&
                runtime.Last.CallType == JSCallType.FunctionCall && runtime.Last.ResultType == JSCallResultType.Default,
                "Nearest actual typed function control differs from its declared producer.");
            runtime.Complete(runtime.Last);
            RuntimeBoundary.Require(await task == RuntimeBoundary.TypedResult, "Nearest typed public reply differs.");
            observations.Add(new("NearestTypedFunctionControl_ResultValuePreserved",
                new { declaredResult = runtime.Last.ResultType.ToString(), actualTypedValue = RuntimeBoundary.TypedResult }));
        }
        var deadlineFailures = 0;
        for (var repetition = 1; repetition <= 3; repetition++)
        {
            using var runtime = new RuntimeBoundary();
            var consumer = new RetainingRuntime(runtime);
            var watch = Stopwatch.StartNew();
            var task = JSRuntimeExtensions.InvokeConstructorAsync(consumer, RuntimeBoundary.Identifier,
                TimeSpan.FromMilliseconds(100), RuntimeBoundary.Arguments).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted, "Original finite constructor did not reach pending work.");
            runtime.ValidateConstructor(runtime.Last);
            var token = consumer.LastToken;
            await SentinelAsync();
            RuntimeBoundary.Require(watch.Elapsed.TotalMilliseconds >= 100 && token.CanBeCanceled &&
                !token.IsCancellationRequested && !task.IsCompleted,
                "Original constructor deadline characterization changed or did not reach its disputed precondition.");
            deadlineFailures++;
            var elapsed = watch.Elapsed.TotalMilliseconds;
            runtime.Complete(runtime.Last);
            var reference = await task;
            RuntimeBoundary.RequireReference(reference);
            observations.Add(new("OriginalFiniteConstructorDeadline_FailsWhilePending", new
            {
                repetition,
                elapsedMilliseconds = elapsed,
                tokenCanBeCanceled = true,
                tokenRequestedAtObservedDeadline = false,
                taskPendingAtObservedDeadline = true,
                actualDeadlineAssertionPassed = false,
                laterReferenceReplyCompletes = true
            }));
            using var controlRuntime = new RuntimeBoundary();
            var controlConsumer = new RetainingRuntime(controlRuntime);
            var control = JSRuntimeExtensions.InvokeAsync<int>(controlConsumer, RuntimeBoundary.Identifier,
                TimeSpan.FromMilliseconds(100), RuntimeBoundary.Arguments).AsTask();
            RuntimeBoundary.Require(!control.IsCompleted, "Awaited positive timeout control did not reach pending work.");
            await SentinelAsync();
            await RequireCancellationAsync(control, controlConsumer.LastToken);
            controlRuntime.Complete(controlRuntime.Last);
            RuntimeBoundary.Require(control.IsCanceled, "Late control reply changed its actual cancellation.");
            observations.Add(new("NearestAwaitedInvokeDeadline_CancelsPending", new
            {
                repetition,
                actualExceptionTokenMatched = true,
                tokenRequested = controlConsumer.LastToken.IsCancellationRequested,
                lateReplyPreservedCancellation = true
            }));
        }
        foreach (var policy in new[] { TimeoutPolicy.Infinite, TimeoutPolicy.ExplicitNone })
        {
            using var defaultRuntime = new RuntimeBoundary(TimeSpan.FromMilliseconds(100));
            using var overrideRuntime = new RuntimeBoundary(TimeSpan.FromMilliseconds(100));
            var consumer = new RetainingRuntime(overrideRuntime);
            var ordinary = defaultRuntime.InvokeConstructorAsync(RuntimeBoundary.Identifier, RuntimeBoundary.Arguments).AsTask();
            var overridden = RuntimeBoundary.Start(consumer, policy).AsTask();
            RuntimeBoundary.Require(!ordinary.IsCompleted && !overridden.IsCompleted, "Constructor default/override did not reach both actual pending producers.");
            defaultRuntime.ValidateConstructor(defaultRuntime.Last);
            overrideRuntime.ValidateConstructor(overrideRuntime.Last);
            await SentinelAsync();
            RuntimeBoundary.Require(ordinary.IsCanceled && !overridden.IsCompleted && consumer.LastToken == CancellationToken.None,
                "Actual constructor override inherited the configured default or used a different token.");
            await RequireCancellationAsync(ordinary);
            defaultRuntime.Complete(defaultRuntime.Last);
            overrideRuntime.Complete(overrideRuntime.Last);
            RuntimeBoundary.RequireReference(await overridden);
            observations.Add(new($"ConstructorOverride_DoesNotInheritDefault_{policy}",
                new { actualDefaultCanceled = true, overridePendingPastDefault = true, tokenIsNone = true, actualReferenceCompleted = true }));
        }
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var task = JSRuntimeExtensions.InvokeConstructorAsync(consumer, RuntimeBoundary.Identifier, TimeSpan.Zero, RuntimeBoundary.Arguments).AsTask();
            RuntimeBoundary.Require(consumer.RequestedAtEntry && consumer.LastToken.CanBeCanceled && task.IsCanceled && runtime.DispatchCount == 0,
                "Zero constructor token did not enter the consumer requested and suppress actual dispatch.");
            await RequireCancellationAsync(task, consumer.LastToken);
            observations.Add(new("ZeroConstructorTimeout_IsRequestedAtConsumerEntry", new { requestedBeforeDispatch = true, dispatches = 0 }));
        }
        foreach (var policy in Enum.GetValues<TimeoutPolicy>())
        {
            using var runtime = new RuntimeBoundary();
            var consumer = new RetainingRuntime(runtime);
            var before = Timer.ActiveCount;
            var task = RuntimeBoundary.Start(consumer, policy).AsTask();
            var pending = Timer.ActiveCount;
            RuntimeBoundary.Require(!task.IsCompleted && pending == before &&
                consumer.LastToken.CanBeCanceled == (policy == TimeoutPolicy.Finite), "Actual original constructor timer/token lifetime differs.");
            runtime.Complete(runtime.Last);
            RuntimeBoundary.RequireReference(await task);
            RuntimeBoundary.Require(Timer.ActiveCount == before, "Constructor completion kept a deadline timer.");
            observations.Add(new($"OriginalConstructorTimerLifetime_{policy}", new
            {
                before,
                pending,
                after = Timer.ActiveCount,
                tokenCanBeCanceled = consumer.LastToken.CanBeCanceled,
                tokenIsNone = consumer.LastToken == CancellationToken.None,
                sourceTimerAlreadyGoneWhilePending = policy == TimeoutPolicy.Finite
            }));
        }
        await ObserveErrorsAsync(observations);
        await ObserveSerializationDeadlineAsync(observations);
        await ObserveOverlapAsync(observations);
        await ObserveRuntimeDisposeAsync(observations);
        await ObserveCompletedRetentionAsync(observations);
        await ObserveReferenceDisposeAsync(observations);
        var reuse = await ObserveGenericReuseAsync();

        return new(observations, MeasureResources(fresh: false), MeasureResources(fresh: true), deadlineFailures, reuse);
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
                (!expected.HasValue || error.CancellationToken == expected.Value), "Cancellation came from watchdog or a different token.");

            return;
        }

        throw new InvalidOperationException("Actual owner operation did not cancel.");
    }

    private static async Task ObserveErrorsAsync(List<Observation> observations)
    {
        await CaptureErrorAsync(observations, "NullRuntime_OriginalSynchronousConstructorError",
            () => JSRuntimeExtensions.InvokeConstructorAsync(null!, RuntimeBoundary.Identifier, RuntimeBoundary.LongDeadline, RuntimeBoundary.Arguments).AsTask(),
            typeof(ArgumentNullException), returnedTask: false, parameter: "jsRuntime");
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        await CaptureErrorAsync(observations, "InvalidTimeout_OriginalSynchronousConstructorError",
            () => JSRuntimeExtensions.InvokeConstructorAsync(runtime, RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(-2), RuntimeBoundary.Arguments).AsTask(),
            typeof(ArgumentOutOfRangeException), returnedTask: false, parameter: "delay");
        await CaptureErrorAsync(observations, "ActualConstructorSerializationGetterFailure",
            () => RuntimeBoundary.Start(runtime, TimeoutPolicy.Finite, [new ThrowingArgument()]).AsTask(),
            typeof(InvalidOperationException), returnedTask: false);
        using var failing = new RuntimeBoundary { ThrowOnDispatch = true };
        await CaptureErrorAsync(observations, "ActualSynchronousConstructorTransportFailure",
            () => RuntimeBoundary.Start(failing, TimeoutPolicy.Finite).AsTask(), typeof(DispatchFailure), returnedTask: false);
        using var protocol = new RuntimeBoundary();
        await CaptureErrorAsync(observations, "ActualAsynchronousConstructorProtocolFailure", () =>
        {
            var task = RuntimeBoundary.Start(protocol, TimeoutPolicy.Finite).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted, "Constructor protocol failure needs an actual pending producer.");
            protocol.ValidateConstructor(protocol.Last);
            protocol.Complete(protocol.Last, success: false);

            return task;
        }, typeof(JSException), returnedTask: true);
    }

    private static async Task CaptureErrorAsync(List<Observation> observations, string name, Func<Task> start,
        Type expected, bool returnedTask, string? parameter = null)
    {
        var before = Timer.ActiveCount;
        Task? task = null;
        try
        {
            task = start();
            await task;
        }
        catch (Exception error) when (error.GetType() == expected)
        {
            RuntimeBoundary.Require((error as ArgumentException)?.ParamName == parameter && Timer.ActiveCount == before &&
                (task is not null) == returnedTask, "Original constructor error parameter/timing/timer cleanup differs.");
            observations.Add(new(name, new
            {
                exceptionType = error.GetType().FullName,
                error.Message,
                parameter,
                returnedTask,
                activeTimerCountRestored = true
            }));

            return;
        }

        throw new InvalidOperationException($"{name} did not raise the expected original error.");
    }

    private static async Task ObserveSerializationDeadlineAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary();
        var consumer = new RetainingRuntime(runtime);
        var gate = new GatedArgument();
        var invocation = Task.Run(async () => await JSRuntimeExtensions.InvokeConstructorAsync(consumer,
            RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(100), [gate]));
        await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await SentinelAsync();
        RuntimeBoundary.Require(consumer.LastToken.IsCancellationRequested, "Actual source did not expire while serialization still owns it.");
        gate.Release.SetResult();
        await RequireCancellationAsync(invocation, consumer.LastToken);
        RuntimeBoundary.Require(runtime.DispatchCount == 1, "Actual original constructor post-serialization dispatch differs.");
        observations.Add(new("ConstructorDeadline_CancelsDuringActualSerialization", new
        {
            getterEntered = true,
            heldBeyondActualDeadline = true,
            actualExceptionTokenMatched = true,
            publicTaskCanceled = true,
            runtime.DispatchCount
        }));
        runtime.Complete(runtime.Last);
    }

    private static async Task ObserveOverlapAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary();
        var consumer = new RetainingRuntime(runtime);
        var tasks = new Task<IJSObjectReference>[8];
        var calls = new JSInvocationInfo[8];
        var tokens = new CancellationToken[8];
        for (var i = 0; i < tasks.Length; i++)
        {
            tasks[i] = JSRuntimeExtensions.InvokeConstructorAsync(consumer, RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(100), RuntimeBoundary.Arguments).AsTask();
            RuntimeBoundary.Require(!tasks[i].IsCompleted, "Every overlap constructor must reach actual pending work.");
            calls[i] = runtime.Last;
            tokens[i] = consumer.LastToken;
            runtime.ValidateConstructor(calls[i]);
        }
        RuntimeBoundary.Require(tokens.Distinct().Count() == 8, "Original overlap constructor tokens are not distinct.");
        runtime.Complete(calls[0]);
        RuntimeBoundary.RequireReference(await tasks[0]);
        await SentinelAsync();
        RuntimeBoundary.Require(tasks.Skip(1).All(task => !task.IsCompleted) && tokens.All(token => !token.IsCancellationRequested),
            "Original overlapping constructor deadline characterization changed.");
        for (var i = 1; i < tasks.Length; i++)
        {
            runtime.Complete(calls[i]);
            RuntimeBoundary.RequireReference(await tasks[i]);
        }
        observations.Add(new("OriginalOverlappingConstructors_DeadlinesGoneBeforeCompletion", new
        {
            actualPendingRequests = 8,
            distinctTokens = 8,
            earlyReferenceSuccess = 1,
            stillPendingAtObservedDeadline = 7,
            actualDeadlineCancellations = 0,
            allLaterReferencesComplete = true,
            successfulTokenNeverCanceled = true
        }));
    }

    private static async Task ObserveRuntimeDisposeAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary();
        var task = RuntimeBoundary.Start(runtime, TimeoutPolicy.Finite).AsTask();
        RuntimeBoundary.Require(!task.IsCompleted, "Runtime dispose probe did not reach actual pending constructor.");
        runtime.Dispose();
        RuntimeBoundary.Require(!task.IsCompleted, "Runtime disposal changed the pending explicit constructor.");
        runtime.Complete(runtime.Last);
        RuntimeBoundary.RequireReference(await task);
        observations.Add(new("RuntimeDispose_PreservesOriginalPendingConstructor",
            new { pendingSurvivedDispose = true, actualReferenceCompleted = true }));
    }

    private static async Task ObserveCompletedRetentionAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        var consumer = new RetainingRuntime(runtime);
        RuntimeBoundary.RequireReference(await RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite));
        var earlier = consumer.LastToken;
        runtime.CompleteInline = false;
        var later = JSRuntimeExtensions.InvokeConstructorAsync(consumer, RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(100), RuntimeBoundary.Arguments).AsTask();
        var laterToken = consumer.LastToken;
        RuntimeBoundary.Require(!later.IsCompleted && earlier != laterToken, "Actual later constructor/token producer differs.");
        await SentinelAsync();
        RuntimeBoundary.Require(earlier.CanBeCanceled && !earlier.IsCancellationRequested && !laterToken.IsCancellationRequested && !later.IsCompleted,
            "Original successful/pending constructor retained-token behavior changed.");
        runtime.Complete(runtime.Last);
        RuntimeBoundary.RequireReference(await later);
        observations.Add(new("OriginalCompletedConstructorToken_RemainsUncanceledAtLaterDeadline", new
        {
            earlierCanBeCanceled = true,
            earlierRequested = false,
            laterRequested = false,
            laterPendingAtDeadline = true,
            tokensDistinct = true
        }));
    }

    private static async Task ObserveReferenceDisposeAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        var reference = await RuntimeBoundary.Start(runtime, TimeoutPolicy.Finite);
        RuntimeBoundary.RequireReference(reference);
        await reference.DisposeAsync();
        RuntimeBoundary.Require(runtime.Last.Identifier == "DotNet.disposeJSObjectReferenceById" &&
            runtime.Last.CallType == JSCallType.FunctionCall && runtime.Last.ResultType == JSCallResultType.JSVoidResult &&
            runtime.Last.TargetInstanceId == 0 && runtime.Last.ArgsJson == "[47]", "Actual reference disposal protocol differs.");
        var before = runtime.DispatchCount;
        try
        {
            _ = reference.InvokeAsync<int>("constructed.control", CancellationToken.None, RuntimeBoundary.Arguments);
        }
        catch (ObjectDisposedException error) when (error.ObjectName == RuntimeBoundary.ReferenceType)
        {
            RuntimeBoundary.Require(runtime.DispatchCount == before, "Disposed reference dispatched new actual work.");
            observations.Add(new("ActualConstructedReferenceDispose_RejectsFurtherPublicCalls",
                new { actualDisposalId = 47, actualNullReply = true, synchronousObjectDisposed = true, furtherDispatches = 0 }));

            return;
        }

        throw new InvalidOperationException("Actual disposed constructor result did not reject its subsequent public call.");
    }

    private static async Task<GenericReuseObservation> ObserveGenericReuseAsync()
    {
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        var consumer = new RetainingRuntime(runtime);
        RuntimeBoundary.RequireReference(await RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite));
        var original = consumer.LastToken;
        using var source = new CancellationTokenSource(RuntimeBoundary.LongDeadline);
        RuntimeBoundary.RequireReference(await JSRuntimeExtensions.InvokeConstructorAsync(consumer, RuntimeBoundary.Identifier,
            source.Token, RuntimeBoundary.Arguments));
        var retained = consumer.LastToken;
        var reset = source.TryReset();
        RuntimeBoundary.Require(reset, "Actual completed constructor source could not reset.");
        runtime.CompleteInline = false;
        source.CancelAfter(TimeSpan.FromMilliseconds(100));
        var later = JSRuntimeExtensions.InvokeConstructorAsync(consumer, RuntimeBoundary.Identifier, source.Token, RuntimeBoundary.Arguments).AsTask();
        RuntimeBoundary.Require(!later.IsCompleted && consumer.LastResultType == typeof(IJSObjectReference),
            "Public reset control bypassed actual pending constructor/reference work.");
        await RequireCancellationAsync(later, retained);
        runtime.Complete(runtime.Last);
        RuntimeBoundary.Require(!original.IsCancellationRequested && retained.IsCancellationRequested && retained == consumer.LastToken,
            "Actual public constructor reset did not change the earlier retained consumer token.");

        return new("GenericTryResetReuse_ChangesPreviouslyCompletedConstructorConsumerToken",
            original.IsCancellationRequested, retained.IsCancellationRequested, later.IsCanceled, reset, false, false, false);
    }

    private static List<ResourceRow> MeasureResources(bool fresh)
    {
        var rows = new List<ResourceRow>();
        foreach (var policy in Enum.GetValues<TimeoutPolicy>())
        {
            using var runtime = new RuntimeBoundary { CompleteInline = true };
            for (var i = 0; i < 200; i++)
            {
                _ = RuntimeBoundary.Run(runtime, policy, ReplyWorkload.Inline);
            }
            var calls = fresh ? 20 : 5000;
            var completed = 0;
            var before = GC.GetAllocatedBytesForCurrentThread();
            for (var i = 0; i < calls; i++)
            {
                if (fresh)
                {
                    using var next = new RuntimeBoundary { CompleteInline = true };
                    _ = RuntimeBoundary.Run(next, policy, ReplyWorkload.Inline);
                }
                else
                {
                    _ = RuntimeBoundary.Run(runtime, policy, ReplyWorkload.Inline);
                }
                completed++;
            }
            var bytes = GC.GetAllocatedBytesForCurrentThread() - before;
            RuntimeBoundary.Require(completed == calls && bytes > 0, "Actual constructor resource batch failed to consume each reference.");
            rows.Add(new(fresh ? "FreshActualConstructorRuntime" : "WarmActualPublicConstructorOwner",
                policy, calls, bytes, (double)bytes / calls, completed));
        }

        return rows;
    }

    private sealed class ThrowingArgument
    {
        public int Value => throw new InvalidOperationException("actual-serialization-getter");
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
                Release.Task.WaitAsync(TimeSpan.FromSeconds(5)).GetAwaiter().GetResult();

                return RuntimeBoundary.TypedResult;
            }
        }
    }
}
