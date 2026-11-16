using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Infrastructure;

namespace AutoPerf;

internal sealed record Observation(string Name, object Detail);
internal sealed record ResourceRow(string Workload, TimeoutPolicy Policy, int Calls, long Bytes, double BytesPerCall,
    int SuccessfullyAcknowledgedWrites, int ActuallyDispatchedScalarWrites, long EmittedValueChecksum);
internal sealed record GenericReuseObservation(string Name, bool ActualOriginalRetainedTokenCanceled, bool ActualReusedRetainedTokenCanceled,
    bool ActualLaterCallCanceled, bool ActualResetSucceeded, bool IsShippingCandidate, bool IsBenchmarkSpeedup, bool GenericReuseEquivalent);
internal sealed record ProbeReport(List<Observation> Observations, List<ResourceRow> Resources, List<ResourceRow> FreshRuntimeResources,
    int OriginalPropertyWriteDeadlineFailures, GenericReuseObservation GenericReuseControl,
    bool PropertyHasInputValueSerialization, bool ActualRuntimeSetterIsAsync);

internal static class TimeoutProbe
{
    public static async Task<ProbeReport> CharacterizeAsync()
    {
        var observations = new List<Observation>();
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var task = RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite).AsTask();
            var inputType = consumer.LastInputType ?? throw new InvalidOperationException("Actual setter input type missing.");
            RuntimeBoundary.Require(!task.IsCompleted && inputType == typeof(int),
                "Actual scalar setter did not reach pending work with its real input type.");
            runtime.ValidatePropertyWrite(runtime.Last);
            runtime.Complete(runtime.Last);
            await task;
            observations.Add(new("ActualPropertyWrite_EmitsValueAndConsumesNullAck", new
            {
                actualInputType = inputType.FullName,
                actualPendingResultMarker = typeof(IJSVoidResult).FullName,
                actualBenchmarkReturnType = typeof(void).FullName,
                actualSerializedArguments = runtime.Last.ArgsJson,
                actualWrittenValue = RuntimeBoundary.PropertyValue,
                actualPublicReply = "null",
                actualAcknowledgmentCompleted = task.IsCompletedSuccessfully
            }));
        }
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var task = RuntimeBoundary.StartValue(consumer, TimeoutPolicy.Finite, new[] { 123, 731 }).AsTask();
            var inputType = consumer.LastInputType ?? throw new InvalidOperationException("Actual array-value input type missing.");
            RuntimeBoundary.Require(!task.IsCompleted && inputType == typeof(int[]),
                "Actual array-value setter bypassed its real generic serializer.");
            runtime.ValidatePropertyWrite(runtime.Last, "[[123,731]]");
            runtime.Complete(runtime.Last);
            await task;
            observations.Add(new("ActualArrayPropertyValue_PreservesEveryNondefaultElement", new
            {
                actualInputType = inputType.FullName,
                actualSerializedArguments = runtime.Last.ArgsJson,
                actualElements = new[] { 123, 731 },
                actualPublicReply = "null",
                actualAcknowledgmentCompleted = task.IsCompletedSuccessfully
            }));
        }
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var task = JSRuntimeExtensions.InvokeVoidAsync(consumer, RuntimeBoundary.Identifier,
                RuntimeBoundary.LongDeadline, [RuntimeBoundary.PropertyValue]).AsTask();
            var resultType = consumer.LastResultType ?? throw new InvalidOperationException("Actual void-function result marker missing.");
            RuntimeBoundary.Require(!task.IsCompleted && resultType == typeof(IJSVoidResult) &&
                runtime.Last.CallType == JSCallType.FunctionCall && runtime.Last.ResultType == JSCallResultType.JSVoidResult,
                "Nearest actual awaited void-function producer differs.");
            runtime.Complete(runtime.Last);
            await task;
            observations.Add(new("NearestAwaitedVoidFunctionControl_ConsumesActualNullAck", new
            {
                actualPendingResultMarker = resultType.FullName,
                actualPublicReply = "null",
                actualAcknowledgmentCompleted = task.IsCompletedSuccessfully
            }));
        }
        var deadlineFailures = 0;
        for (var repetition = 1; repetition <= 3; repetition++)
        {
            using var runtime = new RuntimeBoundary();
            var consumer = new RetainingRuntime(runtime);
            var watch = Stopwatch.StartNew();
            var task = JSRuntimeExtensions.SetValueAsync(consumer, RuntimeBoundary.Identifier, RuntimeBoundary.PropertyValue,
                TimeSpan.FromMilliseconds(100)).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted, "Original finite setter did not reach pending work.");
            runtime.ValidatePropertyWrite(runtime.Last);
            var token = consumer.LastToken;
            await SentinelAsync();
            RuntimeBoundary.Require(watch.Elapsed.TotalMilliseconds >= 100 && token.CanBeCanceled &&
                !token.IsCancellationRequested && !task.IsCompleted,
                "Original setter deadline changed or did not reach its disputed precondition.");
            deadlineFailures++;
            var elapsed = watch.Elapsed.TotalMilliseconds;
            runtime.Complete(runtime.Last);
            await task;
            observations.Add(new("OriginalFinitePropertyWriteDeadline_FailsWhilePending", new
            {
                repetition,
                elapsedMilliseconds = elapsed,
                tokenCanBeCanceled = true,
                tokenRequestedAtObservedDeadline = false,
                taskPendingAtObservedDeadline = true,
                actualDeadlineAssertionPassed = false,
                laterNullAckCompletes = task.IsCompletedSuccessfully
            }));
            using var controlRuntime = new RuntimeBoundary();
            var controlConsumer = new RetainingRuntime(controlRuntime);
            var control = JSRuntimeExtensions.InvokeVoidAsync(controlConsumer, RuntimeBoundary.Identifier,
                TimeSpan.FromMilliseconds(100), [RuntimeBoundary.PropertyValue]).AsTask();
            RuntimeBoundary.Require(!control.IsCompleted && controlConsumer.LastResultType == typeof(IJSVoidResult) &&
                controlRuntime.Last.CallType == JSCallType.FunctionCall && controlRuntime.Last.ResultType == JSCallResultType.JSVoidResult,
                "Awaited void timeout control did not reach its actual pending producer.");
            await SentinelAsync();
            await RequireCancellationAsync(control, controlConsumer.LastToken);
            controlRuntime.Complete(controlRuntime.Last);
            RuntimeBoundary.Require(control.IsCanceled, "Late null control reply changed actual cancellation.");
            observations.Add(new("NearestAwaitedVoidDeadline_CancelsPending", new
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
            var ordinary = defaultRuntime.SetValueAsync(RuntimeBoundary.Identifier, RuntimeBoundary.PropertyValue).AsTask();
            var overridden = RuntimeBoundary.Start(consumer, policy).AsTask();
            RuntimeBoundary.Require(!ordinary.IsCompleted && !overridden.IsCompleted, "Default/override setter producers were not both pending.");
            defaultRuntime.ValidatePropertyWrite(defaultRuntime.Last);
            overrideRuntime.ValidatePropertyWrite(overrideRuntime.Last);
            await SentinelAsync();
            RuntimeBoundary.Require(ordinary.IsCanceled && !overridden.IsCompleted && consumer.LastToken == CancellationToken.None,
                "Actual setter override inherited the configured default or changed the None token.");
            await RequireCancellationAsync(ordinary);
            defaultRuntime.Complete(defaultRuntime.Last);
            overrideRuntime.Complete(overrideRuntime.Last);
            await overridden;
            observations.Add(new($"PropertyWriteOverride_DoesNotInheritDefault_{policy}", new
            {
                actualDefaultCanceled = true,
                overridePendingPastDefault = true,
                tokenIsNone = true,
                actualNullAckCompleted = overridden.IsCompletedSuccessfully
            }));
        }
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var task = JSRuntimeExtensions.SetValueAsync(consumer, RuntimeBoundary.Identifier, RuntimeBoundary.PropertyValue, TimeSpan.Zero).AsTask();
            RuntimeBoundary.Require(consumer.RequestedAtEntry && consumer.LastToken.CanBeCanceled && task.IsCanceled && runtime.DispatchCount == 0,
                "Zero setter token did not enter the public consumer requested and suppress actual dispatch.");
            await RequireCancellationAsync(task, consumer.LastToken);
            observations.Add(new("ZeroPropertyWriteTimeout_IsRequestedAtConsumerEntry", new { requestedBeforeDispatch = true, dispatches = 0 }));
        }
        foreach (var policy in Enum.GetValues<TimeoutPolicy>())
        {
            using var runtime = new RuntimeBoundary();
            var consumer = new RetainingRuntime(runtime);
            var before = Timer.ActiveCount;
            var task = RuntimeBoundary.Start(consumer, policy).AsTask();
            var pending = Timer.ActiveCount;
            RuntimeBoundary.Require(!task.IsCompleted && pending == before &&
                consumer.LastToken.CanBeCanceled == (policy == TimeoutPolicy.Finite), "Original setter timer/token lifetime differs.");
            runtime.Complete(runtime.Last);
            await task;
            RuntimeBoundary.Require(Timer.ActiveCount == before, "Setter acknowledgment kept a deadline timer.");
            observations.Add(new($"OriginalPropertyWriteTimerLifetime_{policy}", new
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
        var reuse = await ObserveGenericReuseAsync();
        RuntimeBoundary.Require(observations.Count == 25, "Every declared setter observation must actually execute.");

        return new(observations, MeasureResources(fresh: false), MeasureResources(fresh: true), deadlineFailures, reuse, true, true);
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
        await CaptureErrorAsync(observations, "NullRuntime_OriginalSynchronousPropertyWriteError",
            () => JSRuntimeExtensions.SetValueAsync(null!, RuntimeBoundary.Identifier, RuntimeBoundary.PropertyValue,
                RuntimeBoundary.LongDeadline).AsTask(), typeof(ArgumentNullException), returnedTask: false, parameter: "jsRuntime");
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        await CaptureErrorAsync(observations, "InvalidTimeout_OriginalSynchronousPropertyWriteError",
            () => JSRuntimeExtensions.SetValueAsync(runtime, RuntimeBoundary.Identifier, RuntimeBoundary.PropertyValue,
                TimeSpan.FromMilliseconds(-2)).AsTask(), typeof(ArgumentOutOfRangeException), returnedTask: false, parameter: "delay");
        await CaptureErrorAsync(observations, "ActualPropertyWriteSerializationFailure_IsReturnedTaskError",
            () => RuntimeBoundary.StartValue(runtime, TimeoutPolicy.Finite, new ThrowingValue()).AsTask(),
            typeof(InvalidOperationException), returnedTask: true);
        using var failing = new RuntimeBoundary { ThrowOnDispatch = true };
        await CaptureErrorAsync(observations, "ActualPropertyWriteSynchronousTransportFailure_IsReturnedTaskError",
            () => RuntimeBoundary.Start(failing, TimeoutPolicy.Finite).AsTask(), typeof(DispatchFailure), returnedTask: true);
        using var protocol = new RuntimeBoundary();
        await CaptureErrorAsync(observations, "ActualAsynchronousPropertyWriteProtocolFailure", () =>
        {
            var task = RuntimeBoundary.Start(protocol, TimeoutPolicy.Finite).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted, "Setter protocol error needs a real pending producer.");
            protocol.ValidatePropertyWrite(protocol.Last);
            protocol.Complete(protocol.Last, success: false);

            return task;
        }, typeof(JSException), returnedTask: true);
        using var wrongReply = new RuntimeBoundary();
        await CaptureErrorAsync(observations, "ActualPropertyVoidResultDeserializationFailure", () =>
        {
            var task = RuntimeBoundary.Start(wrongReply, TimeoutPolicy.Finite).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted, "Void deserialization error needs the real setter pending result.");
            wrongReply.ValidatePropertyWrite(wrongReply.Last);
            wrongReply.CompleteJson(wrongReply.Last, "731");

            return task;
        }, typeof(JSException), returnedTask: true, requireJsonInner: true);
    }

    private static async Task CaptureErrorAsync(List<Observation> observations, string name, Func<Task> start,
        Type expected, bool returnedTask, string? parameter = null, bool requireJsonInner = false)
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
                (task is not null) == returnedTask && (!requireJsonInner || error.InnerException is JsonException),
                "Original setter error parameter/async boundary/timer cleanup/inner producer differs.");
            observations.Add(new(name, new
            {
                exceptionType = error.GetType().FullName,
                error.Message,
                parameter,
                returnedTask,
                activeTimerCountRestored = true,
                innerExceptionType = error.InnerException?.GetType().FullName,
                innerExceptionIsJsonException = error.InnerException is JsonException
            }));

            return;
        }

        throw new InvalidOperationException($"{name} did not raise the expected original error.");
    }

    private static async Task ObserveSerializationDeadlineAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary();
        var consumer = new RetainingRuntime(runtime);
        var gate = new GatedValue();
        var wrapperReturned = false;
        var invocation = Task.Run(async () =>
        {
            var pending = JSRuntimeExtensions.SetValueAsync(consumer, RuntimeBoundary.Identifier, gate, TimeSpan.FromMilliseconds(100));
            Volatile.Write(ref wrapperReturned, true);
            await pending;
        });
        try
        {
            await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
            var token = consumer.LastToken;
            var requested = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            using var observation = token.Register(() => requested.TrySetResult());
            await requested.Task.WaitAsync(TimeSpan.FromSeconds(5));
            RuntimeBoundary.Require(token.IsCancellationRequested && !Volatile.Read(ref wrapperReturned) && runtime.DispatchCount == 0,
                "Actual setter CTS did not cancel while its real value serializer held the extension before return.");
        }
        finally
        {
            gate.Release.TrySetResult();
        }
        await RequireCancellationAsync(invocation, consumer.LastToken);
        RuntimeBoundary.Require(runtime.DispatchCount == 1 && Volatile.Read(ref wrapperReturned),
            "Original setter post-serialization dispatch/returned-task boundary differs.");
        runtime.ValidatePropertyWrite(runtime.Last, "[{\"value\":123}]");
        runtime.Complete(runtime.Last);
        RuntimeBoundary.Require(invocation.IsCanceled, "Late null acknowledgment changed serialization-time cancellation.");
        observations.Add(new("PropertyWriteDeadline_CancelsDuringActualValueSerialization", new
        {
            getterEntered = true,
            tokenRequestedWhileGetterHeld = true,
            extensionHadNotReturnedAtCancellation = true,
            dispatchesAtCancellation = 0,
            actualExceptionTokenMatched = true,
            actualSerializedArguments = runtime.Last.ArgsJson,
            publicTaskCanceled = true,
            lateNullAckPreservedCancellation = true,
            runtime.DispatchCount
        }));
    }

    private static async Task ObserveOverlapAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary();
        var consumer = new RetainingRuntime(runtime);
        var tasks = new Task[8];
        var calls = new JSInvocationInfo[8];
        var tokens = new CancellationToken[8];
        for (var i = 0; i < tasks.Length; i++)
        {
            tasks[i] = JSRuntimeExtensions.SetValueAsync(consumer, RuntimeBoundary.Identifier, RuntimeBoundary.PropertyValue,
                TimeSpan.FromMilliseconds(100)).AsTask();
            RuntimeBoundary.Require(!tasks[i].IsCompleted, "Every overlap setter must reach real pending work.");
            calls[i] = runtime.Last;
            tokens[i] = consumer.LastToken;
            runtime.ValidatePropertyWrite(calls[i]);
        }
        RuntimeBoundary.Require(tokens.Distinct().Count() == 8, "Original overlap setter tokens are not distinct.");
        runtime.Complete(calls[0]);
        await tasks[0];
        await SentinelAsync();
        RuntimeBoundary.Require(tasks.Skip(1).All(task => !task.IsCompleted) && tokens.All(token => !token.IsCancellationRequested),
            "Original overlapping setter deadline characterization changed.");
        for (var i = 1; i < tasks.Length; i++)
        {
            runtime.Complete(calls[i]);
            await tasks[i];
        }
        observations.Add(new("OriginalOverlappingPropertyWrites_DeadlinesGoneBeforeCompletion", new
        {
            actualPendingRequests = 8,
            distinctTokens = 8,
            earlyNullAckSuccess = 1,
            stillPendingAtObservedDeadline = 7,
            actualDeadlineCancellations = 0,
            allLaterNullAcksComplete = tasks.All(task => task.IsCompletedSuccessfully),
            successfulTokenNeverCanceled = true,
            actuallyEmittedScalarValueChecksum = runtime.EmittedScalarValueChecksum
        }));
    }

    private static async Task ObserveRuntimeDisposeAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary();
        var task = RuntimeBoundary.Start(runtime, TimeoutPolicy.Finite).AsTask();
        RuntimeBoundary.Require(!task.IsCompleted, "Runtime dispose probe did not reach a real pending setter.");
        runtime.Dispose();
        RuntimeBoundary.Require(!task.IsCompleted, "Runtime disposal changed the pending explicit setter.");
        runtime.Complete(runtime.Last);
        await task;
        observations.Add(new("RuntimeDispose_PreservesOriginalPendingPropertyWrite",
            new { pendingSurvivedDispose = true, actualNullAckCompleted = task.IsCompletedSuccessfully }));
    }

    private static async Task ObserveCompletedRetentionAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        var consumer = new RetainingRuntime(runtime);
        await RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite);
        var earlier = consumer.LastToken;
        runtime.CompleteInline = false;
        var later = JSRuntimeExtensions.SetValueAsync(consumer, RuntimeBoundary.Identifier, RuntimeBoundary.PropertyValue,
            TimeSpan.FromMilliseconds(100)).AsTask();
        var laterToken = consumer.LastToken;
        RuntimeBoundary.Require(!later.IsCompleted && earlier != laterToken, "Actual later setter/token producer differs.");
        await SentinelAsync();
        RuntimeBoundary.Require(earlier.CanBeCanceled && !earlier.IsCancellationRequested && !laterToken.IsCancellationRequested && !later.IsCompleted,
            "Original completed/pending setter retained-token behavior changed.");
        runtime.Complete(runtime.Last);
        await later;
        observations.Add(new("OriginalCompletedPropertyWriteToken_RemainsUncanceledAtLaterDeadline", new
        {
            earlierCanBeCanceled = true,
            earlierRequested = false,
            laterRequested = false,
            laterPendingAtDeadline = true,
            tokensDistinct = true,
            laterActualNullAckCompleted = later.IsCompletedSuccessfully
        }));
    }

    private static async Task<GenericReuseObservation> ObserveGenericReuseAsync()
    {
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        var consumer = new RetainingRuntime(runtime);
        await RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite);
        var original = consumer.LastToken;
        using var source = new CancellationTokenSource(RuntimeBoundary.LongDeadline);
        await consumer.SetValueAsync(RuntimeBoundary.Identifier, RuntimeBoundary.PropertyValue, source.Token);
        var retained = consumer.LastToken;
        var reset = source.TryReset();
        RuntimeBoundary.Require(reset, "Actual completed setter source could not reset.");
        runtime.CompleteInline = false;
        source.CancelAfter(TimeSpan.FromMilliseconds(100));
        var later = consumer.SetValueAsync(RuntimeBoundary.Identifier, RuntimeBoundary.PropertyValue, source.Token).AsTask();
        RuntimeBoundary.Require(!later.IsCompleted && consumer.LastInputType == typeof(int),
            "Public reset control bypassed real pending scalar setter work.");
        runtime.ValidatePropertyWrite(runtime.Last);
        await RequireCancellationAsync(later, retained);
        runtime.Complete(runtime.Last);
        RuntimeBoundary.Require(!original.IsCancellationRequested && retained.IsCancellationRequested && retained == consumer.LastToken && later.IsCanceled,
            "Public setter reset did not change the earlier retained consumer token.");

        return new("GenericTryResetReuse_ChangesPreviouslyCompletedPropertyWriteConsumerToken",
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
                RuntimeBoundary.Run(runtime, policy, ReplyWorkload.Inline);
            }
            var calls = fresh ? 20 : 5000;
            var completed = 0;
            var dispatched = 0;
            long checksum = 0;
            var priorCount = runtime.ScalarPropertyWriteCount;
            var priorChecksum = runtime.EmittedScalarValueChecksum;
            var before = GC.GetAllocatedBytesForCurrentThread();
            for (var i = 0; i < calls; i++)
            {
                if (fresh)
                {
                    using var next = new RuntimeBoundary { CompleteInline = true };
                    RuntimeBoundary.Run(next, policy, ReplyWorkload.Inline);
                    dispatched += next.ScalarPropertyWriteCount;
                    checksum += next.EmittedScalarValueChecksum;
                }
                else
                {
                    RuntimeBoundary.Run(runtime, policy, ReplyWorkload.Inline);
                }
                completed++;
            }
            var bytes = GC.GetAllocatedBytesForCurrentThread() - before;
            if (!fresh)
            {
                dispatched = runtime.ScalarPropertyWriteCount - priorCount;
                checksum = runtime.EmittedScalarValueChecksum - priorChecksum;
            }
            RuntimeBoundary.Require(completed == calls && dispatched == calls && checksum == calls * RuntimeBoundary.PropertyValue && bytes > 0,
                "Real setter resource batch did not emit value123 and consume each public acknowledgment.");
            rows.Add(new(fresh ? "FreshActualPropertyWriteRuntime" : "WarmActualPublicPropertyWriteOwner",
                policy, calls, bytes, (double)bytes / calls, completed, dispatched, checksum));
        }

        return rows;
    }

    private sealed class ThrowingValue
    {
        public int Value => throw new InvalidOperationException("actual-setter-serialization-getter");
    }

    private sealed class GatedValue
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

                return RuntimeBoundary.PropertyValue;
            }
        }
    }
}
