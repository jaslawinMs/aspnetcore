using System.Diagnostics;
using System.Text.Json;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Infrastructure;

namespace AutoPerf;

internal sealed record Observation(string Name, object Detail);
internal sealed record ResourceRow(string Workload, TimeoutPolicy Policy, int Calls, long Bytes, double BytesPerCall,
    int SuccessfullyConsumedValues, int ActualValueChecksum);
internal sealed record GenericReuseObservation(string Name, bool ActualOriginalRetainedTokenCanceled, bool ActualReusedRetainedTokenCanceled,
    bool ActualLaterCallCanceled, bool ActualResetSucceeded, bool IsShippingCandidate, bool IsBenchmarkSpeedup, bool GenericReuseEquivalent);
internal sealed record ProbeReport(List<Observation> Observations, List<ResourceRow> Resources, List<ResourceRow> FreshRuntimeResources,
    int OriginalPropertyDeadlineFailures, GenericReuseObservation GenericReuseControl, bool PropertyHasInputArguments);

internal static class TimeoutProbe
{
    public static async Task<ProbeReport> CharacterizeAsync()
    {
        var observations = new List<Observation>();
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var task = RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite).AsTask();
            var resultType = consumer.LastResultType ?? throw new InvalidOperationException("Actual property result type missing.");
            RuntimeBoundary.Require(!task.IsCompleted && resultType == typeof(int),
                "Actual timed property read did not reach the declared pending int producer.");
            runtime.ValidateProperty(runtime.Last);
            runtime.Complete(runtime.Last);
            var value = await task;
            RuntimeBoundary.RequireValue(value);
            observations.Add(new("ActualPropertyRead_ConsumesTypedPublicReply", new
            {
                underlyingResultType = resultType.FullName,
                actualTypedValue = value,
                actualPublicReply = "731",
                actualCallType = runtime.Last.CallType.ToString(),
                actualTarget = runtime.Last.TargetInstanceId,
                inputArgumentsJson = runtime.Last.ArgsJson,
                propertyHasInputArguments = false
            }));
        }
        using (var runtime = new RuntimeBoundary())
        {
            var reference = runtime.ReadReferenceProperty();
            var material = runtime.VerifyMaterialReferenceProperty(reference);
            observations.Add(new("ActualReferenceProperty_ConvertedReferenceReadsMaterialTarget", new
            {
                actualReturnedType = reference.GetType().FullName,
                referenceOwnerSha256 = Evidence.Hash(reference.GetType().Assembly.Location),
                actualProtocolResult = "{\"__jsObjectId\":47}",
                materialCallType = runtime.Last.CallType.ToString(),
                materialTarget = runtime.Last.TargetInstanceId,
                materialValue = material,
                inputArgumentsJson = runtime.Last.ArgsJson
            }));
        }
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var task = JSRuntimeExtensions.InvokeAsync<int>(consumer, RuntimeBoundary.Identifier,
                RuntimeBoundary.LongDeadline, args: null).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted && consumer.LastResultType == typeof(int) &&
                runtime.Last.CallType == JSCallType.FunctionCall && runtime.Last.ResultType == JSCallResultType.Default &&
                runtime.Last.ArgsJson == "[]", "Nearest typed no-args function control differs.");
            runtime.Complete(runtime.Last);
            RuntimeBoundary.RequireValue(await task);
            observations.Add(new("NearestTypedFunctionControl_ResultValuePreserved",
                new { declaredCallType = runtime.Last.CallType.ToString(), actualTypedValue = RuntimeBoundary.TypedResult }));
        }
        var deadlineFailures = 0;
        for (var repetition = 1; repetition <= 3; repetition++)
        {
            using var runtime = new RuntimeBoundary();
            var consumer = new RetainingRuntime(runtime);
            var watch = Stopwatch.StartNew();
            var task = JSRuntimeExtensions.GetValueAsync<int>(consumer, RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(100)).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted, "Original finite property read did not reach pending work.");
            runtime.ValidateProperty(runtime.Last);
            var token = consumer.LastToken;
            await SentinelAsync();
            RuntimeBoundary.Require(watch.Elapsed.TotalMilliseconds >= 100 && token.CanBeCanceled &&
                !token.IsCancellationRequested && !task.IsCompleted,
                "Original property deadline failure changed or did not reach its disputed precondition.");
            deadlineFailures++;
            var elapsed = watch.Elapsed.TotalMilliseconds;
            runtime.Complete(runtime.Last);
            RuntimeBoundary.RequireValue(await task);
            observations.Add(new("OriginalFinitePropertyDeadline_FailsWhilePending", new
            {
                repetition,
                elapsedMilliseconds = elapsed,
                tokenCanBeCanceled = true,
                tokenRequestedAtObservedDeadline = false,
                taskPendingAtObservedDeadline = true,
                actualDeadlineAssertionPassed = false,
                laterValueReplyCompletes = true
            }));
            using var controlRuntime = new RuntimeBoundary();
            var controlConsumer = new RetainingRuntime(controlRuntime);
            var control = JSRuntimeExtensions.InvokeAsync<int>(controlConsumer, RuntimeBoundary.Identifier,
                TimeSpan.FromMilliseconds(100), args: null).AsTask();
            RuntimeBoundary.Require(!control.IsCompleted, "Nearest awaited timeout control did not reach pending work.");
            await SentinelAsync();
            await RequireCancellationAsync(control, controlConsumer.LastToken);
            controlRuntime.Complete(controlRuntime.Last);
            RuntimeBoundary.Require(control.IsCanceled, "Late control reply changed its cancellation.");
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
            var ordinary = defaultRuntime.GetValueAsync<int>(RuntimeBoundary.Identifier).AsTask();
            var overridden = RuntimeBoundary.Start(consumer, policy).AsTask();
            RuntimeBoundary.Require(!ordinary.IsCompleted && !overridden.IsCompleted, "Property default/override did not reach actual pending producers.");
            defaultRuntime.ValidateProperty(defaultRuntime.Last);
            overrideRuntime.ValidateProperty(overrideRuntime.Last);
            await SentinelAsync();
            RuntimeBoundary.Require(ordinary.IsCanceled && !overridden.IsCompleted && consumer.LastToken == CancellationToken.None,
                "Actual property override inherited the configured default or used a different token.");
            await RequireCancellationAsync(ordinary);
            defaultRuntime.Complete(defaultRuntime.Last);
            overrideRuntime.Complete(overrideRuntime.Last);
            RuntimeBoundary.RequireValue(await overridden);
            observations.Add(new($"PropertyOverride_DoesNotInheritDefault_{policy}",
                new { actualDefaultCanceled = true, overridePendingPastDefault = true, tokenIsNone = true, actualValueCompleted = true }));
        }
        using (var runtime = new RuntimeBoundary())
        {
            var consumer = new RetainingRuntime(runtime);
            var task = JSRuntimeExtensions.GetValueAsync<int>(consumer, RuntimeBoundary.Identifier, TimeSpan.Zero).AsTask();
            RuntimeBoundary.Require(consumer.RequestedAtEntry && consumer.LastToken.CanBeCanceled && task.IsCanceled && runtime.DispatchCount == 0,
                "Zero property token did not enter the consumer requested and suppress actual dispatch.");
            await RequireCancellationAsync(task, consumer.LastToken);
            observations.Add(new("ZeroPropertyTimeout_IsRequestedAtConsumerEntry", new { requestedBeforeDispatch = true, dispatches = 0 }));
        }
        foreach (var policy in Enum.GetValues<TimeoutPolicy>())
        {
            using var runtime = new RuntimeBoundary();
            var consumer = new RetainingRuntime(runtime);
            var before = Timer.ActiveCount;
            var task = RuntimeBoundary.Start(consumer, policy).AsTask();
            var pending = Timer.ActiveCount;
            RuntimeBoundary.Require(!task.IsCompleted && pending == before &&
                consumer.LastToken.CanBeCanceled == (policy == TimeoutPolicy.Finite), "Original property timer/token lifetime differs.");
            runtime.Complete(runtime.Last);
            RuntimeBoundary.RequireValue(await task);
            RuntimeBoundary.Require(Timer.ActiveCount == before, "Property completion kept a deadline timer.");
            observations.Add(new($"OriginalPropertyTimerLifetime_{policy}", new
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
        await ObserveTransportDeadlineAsync(observations);
        await ObserveOverlapAsync(observations);
        await ObserveRuntimeDisposeAsync(observations);
        await ObserveCompletedRetentionAsync(observations);
        await ObserveReferenceDisposeAsync(observations);
        var reuse = await ObserveGenericReuseAsync();

        return new(observations, MeasureResources(fresh: false), MeasureResources(fresh: true), deadlineFailures, reuse, false);
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
        await CaptureErrorAsync(observations, "NullRuntime_OriginalSynchronousPropertyError",
            () => JSRuntimeExtensions.GetValueAsync<int>(null!, RuntimeBoundary.Identifier, RuntimeBoundary.LongDeadline).AsTask(),
            typeof(ArgumentNullException), returnedTask: false, parameter: "jsRuntime");
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        await CaptureErrorAsync(observations, "InvalidTimeout_OriginalSynchronousPropertyError",
            () => JSRuntimeExtensions.GetValueAsync<int>(runtime, RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(-2)).AsTask(),
            typeof(ArgumentOutOfRangeException), returnedTask: false, parameter: "delay");
        using var failing = new RuntimeBoundary { ThrowOnDispatch = true };
        await CaptureErrorAsync(observations, "ActualSynchronousPropertyTransportFailure",
            () => RuntimeBoundary.Start(failing, TimeoutPolicy.Finite).AsTask(), typeof(DispatchFailure), returnedTask: false);
        using var protocol = new RuntimeBoundary();
        await CaptureErrorAsync(observations, "ActualAsynchronousPropertyProtocolFailure", () =>
        {
            var task = RuntimeBoundary.Start(protocol, TimeoutPolicy.Finite).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted, "Property protocol failure needs an actual pending producer.");
            protocol.ValidateProperty(protocol.Last);
            protocol.Complete(protocol.Last, success: false);

            return task;
        }, typeof(JSException), returnedTask: true);
        using var deserialize = new RuntimeBoundary();
        await CaptureErrorAsync(observations, "ActualPropertyResultDeserializationFailure", () =>
        {
            var task = RuntimeBoundary.Start(deserialize, TimeoutPolicy.Finite).AsTask();
            RuntimeBoundary.Require(!task.IsCompleted, "Property result failure needs an actual pending int producer.");
            deserialize.ValidateProperty(deserialize.Last);
            deserialize.Complete(deserialize.Last, payload: "\"actual-not-an-int\"");

            return task;
        }, typeof(JSException), returnedTask: true, jsonInner: true);
    }

    private static async Task CaptureErrorAsync(List<Observation> observations, string name, Func<Task> start,
        Type expected, bool returnedTask, string? parameter = null, bool jsonInner = false)
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
                (task is not null) == returnedTask && (!jsonInner || error.InnerException is JsonException),
                "Original property error parameter/timing/timer cleanup/result JSON exception differs.");
            observations.Add(new(name, new
            {
                exceptionType = error.GetType().FullName,
                innerExceptionType = error.InnerException?.GetType().FullName,
                error.Message,
                parameter,
                returnedTask,
                activeTimerCountRestored = true
            }));

            return;
        }

        throw new InvalidOperationException($"{name} did not raise the expected original error.");
    }

    private static async Task ObserveTransportDeadlineAsync(List<Observation> observations)
    {
        var gate = new TransportGate();
        using var runtime = new RuntimeBoundary { Gate = gate };
        var consumer = new RetainingRuntime(runtime);
        var invocation = Task.Run(async () => await JSRuntimeExtensions.GetValueAsync<int>(consumer,
            RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(100)));
        await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await SentinelAsync();
        RuntimeBoundary.Require(consumer.LastToken.IsCancellationRequested, "Actual source did not expire during the pre-return host transport gate.");
        gate.Release.SetResult();
        await RequireCancellationAsync(invocation, consumer.LastToken);
        runtime.ValidateProperty(runtime.Last);
        RuntimeBoundary.Require(runtime.DispatchCount == 1, "Actual pre-return property transport dispatch differs.");
        observations.Add(new("PropertyDeadline_CancelsDuringManagedPreReturnTransportGate", new
        {
            actualBeginInvokeJSEntered = true,
            heldBeyondActualDeadline = true,
            actualExceptionTokenMatched = true,
            publicTaskCanceled = true,
            propertyHasInputArguments = false,
            boundary = "Test-host synchronous BeginInvokeJS gate;actual CTS/runtime cancellation,not browser stall or argument serialization.",
            runtime.DispatchCount
        }));
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
            tasks[i] = JSRuntimeExtensions.GetValueAsync<int>(consumer, RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(100)).AsTask();
            RuntimeBoundary.Require(!tasks[i].IsCompleted, "Every overlap property read must reach actual pending work.");
            calls[i] = runtime.Last;
            tokens[i] = consumer.LastToken;
            runtime.ValidateProperty(calls[i]);
        }
        RuntimeBoundary.Require(tokens.Distinct().Count() == 8, "Original overlap property tokens are not distinct.");
        runtime.Complete(calls[0]);
        RuntimeBoundary.RequireValue(await tasks[0]);
        await SentinelAsync();
        RuntimeBoundary.Require(tasks.Skip(1).All(task => !task.IsCompleted) && tokens.All(token => !token.IsCancellationRequested),
            "Original overlapping property deadline characterization changed.");
        for (var i = 1; i < tasks.Length; i++)
        {
            runtime.Complete(calls[i]);
            RuntimeBoundary.RequireValue(await tasks[i]);
        }
        observations.Add(new("OriginalOverlappingProperties_DeadlinesGoneBeforeCompletion", new
        {
            actualPendingRequests = 8,
            distinctTokens = 8,
            earlyValueSuccess = 1,
            stillPendingAtObservedDeadline = 7,
            actualDeadlineCancellations = 0,
            allLaterValuesComplete = true,
            successfulTokenNeverCanceled = true
        }));
    }

    private static async Task ObserveRuntimeDisposeAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary();
        var task = RuntimeBoundary.Start(runtime, TimeoutPolicy.Finite).AsTask();
        RuntimeBoundary.Require(!task.IsCompleted, "Runtime dispose probe did not reach an actual pending property read.");
        runtime.Dispose();
        RuntimeBoundary.Require(!task.IsCompleted, "Runtime disposal changed the pending explicit property read.");
        runtime.Complete(runtime.Last);
        RuntimeBoundary.RequireValue(await task);
        observations.Add(new("RuntimeDispose_PreservesOriginalPendingProperty",
            new { pendingSurvivedDispose = true, actualValueCompleted = true }));
    }

    private static async Task ObserveCompletedRetentionAsync(List<Observation> observations)
    {
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        var consumer = new RetainingRuntime(runtime);
        RuntimeBoundary.RequireValue(await RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite));
        var earlier = consumer.LastToken;
        runtime.CompleteInline = false;
        var later = JSRuntimeExtensions.GetValueAsync<int>(consumer, RuntimeBoundary.Identifier, TimeSpan.FromMilliseconds(100)).AsTask();
        var laterToken = consumer.LastToken;
        RuntimeBoundary.Require(!later.IsCompleted && earlier != laterToken, "Actual later property/token producer differs.");
        await SentinelAsync();
        RuntimeBoundary.Require(earlier.CanBeCanceled && !earlier.IsCancellationRequested && !laterToken.IsCancellationRequested && !later.IsCompleted,
            "Original successful/pending property retained-token behavior changed.");
        runtime.Complete(runtime.Last);
        RuntimeBoundary.RequireValue(await later);
        observations.Add(new("OriginalCompletedPropertyToken_RemainsUncanceledAtLaterDeadline", new
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
        var reference = runtime.ReadReferenceProperty();
        await reference.DisposeAsync();
        RuntimeBoundary.Require(runtime.Last.Identifier == "DotNet.disposeJSObjectReferenceById" &&
            runtime.Last.CallType == JSCallType.FunctionCall && runtime.Last.ResultType == JSCallResultType.JSVoidResult &&
            runtime.Last.TargetInstanceId == 0 && runtime.Last.ArgsJson == "[47]", "Actual property-reference disposal protocol differs.");
        var before = runtime.DispatchCount;
        try
        {
            _ = reference.GetValueAsync<int>("nested.control", CancellationToken.None);
        }
        catch (ObjectDisposedException error) when (error.ObjectName == RuntimeBoundary.ReferenceType)
        {
            RuntimeBoundary.Require(runtime.DispatchCount == before, "Disposed property reference dispatched new actual work.");
            observations.Add(new("ActualPropertyReferenceDispose_RejectsFurtherPublicPropertyReads",
                new { actualDisposalId = 47, actualNullReply = true, synchronousObjectDisposed = true, furtherDispatches = 0 }));

            return;
        }

        throw new InvalidOperationException("Actual disposed property result did not reject its subsequent public read.");
    }

    private static async Task<GenericReuseObservation> ObserveGenericReuseAsync()
    {
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        var consumer = new RetainingRuntime(runtime);
        RuntimeBoundary.RequireValue(await RuntimeBoundary.Start(consumer, TimeoutPolicy.Finite));
        var original = consumer.LastToken;
        using var source = new CancellationTokenSource(RuntimeBoundary.LongDeadline);
        RuntimeBoundary.RequireValue(await consumer.GetValueAsync<int>(RuntimeBoundary.Identifier, source.Token));
        var retained = consumer.LastToken;
        var reset = source.TryReset();
        RuntimeBoundary.Require(reset, "Actual completed property source could not reset.");
        runtime.CompleteInline = false;
        source.CancelAfter(TimeSpan.FromMilliseconds(100));
        var later = consumer.GetValueAsync<int>(RuntimeBoundary.Identifier, source.Token).AsTask();
        RuntimeBoundary.Require(!later.IsCompleted && consumer.LastResultType == typeof(int),
            "Public reset control bypassed actual pending property/int work.");
        await RequireCancellationAsync(later, retained);
        runtime.Complete(runtime.Last);
        RuntimeBoundary.Require(!original.IsCancellationRequested && retained.IsCancellationRequested && retained == consumer.LastToken,
            "Actual public property reset did not change the earlier retained consumer token.");

        return new("GenericTryResetReuse_ChangesPreviouslyCompletedPropertyConsumerToken",
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
                completed++;
            }
            var bytes = GC.GetAllocatedBytesForCurrentThread() - before;
            RuntimeBoundary.Require(completed == calls && checksum == calls * RuntimeBoundary.TypedResult && bytes > 0,
                "Actual property resource batch did not consume each returned typed value.");
            rows.Add(new(fresh ? "FreshActualPropertyRuntime" : "WarmActualPublicPropertyOwner",
                policy, calls, bytes, (double)bytes / calls, completed, checksum));
        }

        return rows;
    }
}
