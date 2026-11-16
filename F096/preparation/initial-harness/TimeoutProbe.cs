using System.Diagnostics;
using Microsoft.JSInterop;

namespace AutoPerf;

internal sealed record DeadlineObservation(string Test, CallOperation Operation, int Repetition, bool PendingAtDispatch,
    bool SentinelTimerFired, double ElapsedMilliseconds, bool CanceledBeforeReply, bool ActualCancellationTokenMatched,
    bool LateReplyPreservedCancellation, bool ValueAfterCleanupReply, bool ContractSatisfied);

internal sealed record ErrorObservation(string Test, CallOperation Operation, string ExceptionType, string Timing, string? ParameterName);
internal sealed record TimerObservation(string Test, CallOperation Operation, TimeoutPolicy Policy, long Before, long Pending, long After,
    bool PendingAtDispatch, bool CanBeCanceled, bool TokenIsNone);
internal sealed record ResourceObservation(string Test, CallOperation Operation, TimeoutPolicy Policy, int Calls, int Checksum, long AllocatedBytes);
internal sealed record ProbeReport(int MissingDeadlines, List<DeadlineObservation> Deadlines, List<ErrorObservation> Errors,
    List<TimerObservation> Timers, List<ResourceObservation> Resources, object PoolingControl);

internal static class TimeoutProbe
{
    private static readonly CallOperation[] Operations = Enum.GetValues<CallOperation>();

    public static async Task<ProbeReport> VerifyAsync()
    {
        foreach (var operation in Operations)
        {
            using var runtime = new RuntimeBoundary { CompleteInline = true };
            var reference = runtime.CreateReference();
            RuntimeBoundary.Require(Calls.Run(operation, TimeoutPolicy.Infinite, ReplyTiming.Inline, runtime, reference) == RuntimeBoundary.Result,
                "Actual converter/public-dispatch completion did not produce its value.");
            runtime.ValidateDispatch(operation);
        }
        var timers = ObserveTimers();
        var errors = await ObserveErrorsAsync();
        var deadlines = new List<DeadlineObservation>();
        for (var repetition = 1; repetition <= 3; repetition++)
        {
            foreach (var operation in Operations)
            {
                deadlines.Add(await ObserveDeadlineAsync(operation, repetition));
            }
        }
        var poolingControl = await ObservePoolingControlAsync();
        var resources = ObserveResources();

        return new(deadlines.Count(row => !row.ContractSatisfied), deadlines, errors, timers, resources, poolingControl);
    }

    private static List<TimerObservation> ObserveTimers()
    {
        var observations = new List<TimerObservation>();
        var finiteTokens = new List<CancellationToken>();
        foreach (var operation in Operations)
        {
            foreach (var policy in Enum.GetValues<TimeoutPolicy>())
            {
                using var runtime = new RuntimeBoundary(TimeSpan.FromMilliseconds(10));
                var reference = new RetainingReference(runtime.CreateReference());
                var before = Timer.ActiveCount;
                var task = Calls.Start(operation, reference, policy == TimeoutPolicy.Finite ? Calls.LongDeadline : Timeout.InfiniteTimeSpan);
                var pending = Timer.ActiveCount;
                var wasPending = !task.IsCompleted;
                RuntimeBoundary.Require(wasPending, "Held real runtime task must be incomplete before a reply.");
                runtime.ValidateDispatch(operation);
                var token = reference.LastToken;
                RuntimeBoundary.Require(token.CanBeCanceled == (policy == TimeoutPolicy.Finite), "Finite/infinite public token boundary differs.");
                if (policy == TimeoutPolicy.Infinite)
                {
                    RuntimeBoundary.Require(token == CancellationToken.None && pending == before, "Infinity scheduled a timer or did not use CancellationToken.None.");
                }
                else
                {
                    RuntimeBoundary.Require(finiteTokens.All(previous => previous != token), "Different finite operations reused a token identity.");
                    finiteTokens.Add(token);
                }
                runtime.Complete();
                task.GetAwaiter().GetResult();
                var after = Timer.ActiveCount;
                RuntimeBoundary.Require(after == before, "Completed real operation retained an active timer.");
                observations.Add(new($"ActualPendingTimerLifetime_{operation}_{policy}", operation, policy, before, pending, after,
                    wasPending, token.CanBeCanceled, token == CancellationToken.None));
            }
        }

        return observations;
    }

    private static async Task<DeadlineObservation> ObserveDeadlineAsync(CallOperation operation, int repetition)
    {
        using var runtime = new RuntimeBoundary(TimeSpan.FromMinutes(5));
        var reference = new RetainingReference(runtime.CreateReference());
        var deadline = TimeSpan.FromMilliseconds(100);
        var watch = Stopwatch.StartNew();
        var task = Calls.Start(operation, reference, deadline);
        var pending = !task.IsCompleted;
        RuntimeBoundary.Require(pending, "The finite deadline expired before the actual pending producer was observable.");
        runtime.ValidateDispatch(operation);
        var sentinel = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var timer = new Timer(state => ((TaskCompletionSource)state!).SetResult(), sentinel, TimeSpan.FromMilliseconds(600), Timeout.InfiniteTimeSpan);
        await sentinel.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var elapsed = watch.Elapsed.TotalMilliseconds;
        RuntimeBoundary.Require(elapsed >= deadline.TotalMilliseconds, "Real sentinel timer fired before the finite deadline.");
        var canceled = task.IsCanceled;
        var tokenMatched = false;
        if (canceled)
        {
            try
            {
                await task;
                throw new InvalidOperationException("Canceled actual runtime operation unexpectedly succeeded.");
            }
            catch (TaskCanceledException exception)
            {
                tokenMatched = exception.CancellationToken == reference.LastToken && reference.LastToken.IsCancellationRequested;
                RuntimeBoundary.Require(tokenMatched, "Actual timer cancellation did not preserve its production token.");
            }
        }
        else
        {
            RuntimeBoundary.Require(!task.IsCompleted, "Held actual runtime operation completed without timeout or a public reply.");
        }
        runtime.Complete();
        var preserved = canceled && task.IsCanceled;
        var valueAfterReply = false;
        if (!canceled)
        {
            await task;
            valueAfterReply = operation switch
            {
                CallOperation.Invoke or CallOperation.Get => ((Task<int>)task).Result == RuntimeBoundary.Result,
                CallOperation.Constructor => runtime.SerializeReference(((Task<IJSObjectReference>)task).Result) == "{\"__jsObjectId\":89}",
                _ => task.IsCompletedSuccessfully
            };
            RuntimeBoundary.Require(valueAfterReply, "Late cleanup reply did not complete the retained actual operation.");
        }

        return new($"FiniteTimeout_CancelsPending{operation}", operation, repetition, pending, true, elapsed,
            canceled, tokenMatched, preserved, valueAfterReply, canceled && tokenMatched && preserved);
    }

    private static async Task<List<ErrorObservation>> ObserveErrorsAsync()
    {
        var observations = new List<ErrorObservation>();
        foreach (var operation in Operations)
        {
            using var runtime = new RuntimeBoundary { CompleteInline = true };
            var reference = runtime.CreateReference();
            observations.Add(await CaptureErrorAsync($"NullObject_{operation}", operation, () => Calls.Start(operation, null!, Calls.LongDeadline), typeof(ArgumentNullException)));
            observations.Add(await CaptureErrorAsync($"InvalidTimeout_{operation}", operation, () => Calls.Start(operation, reference, TimeSpan.FromMilliseconds(-2)), typeof(ArgumentOutOfRangeException)));
            await reference.DisposeAsync();
            observations.Add(await CaptureErrorAsync($"DisposedObject_{operation}", operation, () => Calls.Start(operation, reference, Calls.LongDeadline), typeof(ObjectDisposedException)));
            using var failingRuntime = new RuntimeBoundary { ThrowOnDispatch = true };
            var failingReference = failingRuntime.CreateReference();
            observations.Add(await CaptureErrorAsync($"SynchronousTransportFailure_{operation}", operation,
                () => Calls.Start(operation, failingReference, Calls.LongDeadline), typeof(DispatchFailure)));
            using var protocolRuntime = new RuntimeBoundary();
            var protocolReference = protocolRuntime.CreateReference();
            var task = Calls.Start(operation, protocolReference, Calls.LongDeadline);
            RuntimeBoundary.Require(!task.IsCompleted, "Protocol failure probe did not reach the actual pending producer.");
            protocolRuntime.ValidateDispatch(operation);
            protocolRuntime.Complete(success: false);
            observations.Add(await CaptureErrorAsync($"AsyncPublicProtocolFailure_{operation}", operation, () => task, typeof(JSException)));
        }

        return observations;
    }

    private static async Task<ErrorObservation> CaptureErrorAsync(string test, CallOperation operation, Func<Task> start, Type expected)
    {
        Task task;
        try
        {
            task = start();
        }
        catch (Exception exception) when (exception.GetType() == expected)
        {
            return new(test, operation, expected.Name, "synchronous", (exception as ArgumentException)?.ParamName);
        }
        try
        {
            await task;
        }
        catch (Exception exception) when (exception.GetType() == expected)
        {
            return new(test, operation, expected.Name, "returned-task", (exception as ArgumentException)?.ParamName);
        }

        throw new InvalidOperationException($"{test} did not produce {expected.Name}.");
    }

    private static async Task<object> ObservePoolingControlAsync()
    {
        using var runtime = new RuntimeBoundary { CompleteInline = true };
        var reference = new RetainingReference(runtime.CreateReference());
        await reference.InvokeAsync<int>(Calls.Identifier, Calls.LongDeadline, RuntimeBoundary.Arguments);
        var originalCompletedToken = reference.LastToken;
        RuntimeBoundary.Require(!originalCompletedToken.IsCancellationRequested, "Completed original token already canceled.");
        using var source = new CancellationTokenSource(Calls.LongDeadline);
        await reference.InvokeAsync<int>(Calls.Identifier, source.Token, RuntimeBoundary.Arguments);
        var retainedPooledToken = reference.LastToken;
        var reset = source.TryReset();
        RuntimeBoundary.Require(reset, "Real completed CTS could not be reset for the pooling control.");
        runtime.CompleteInline = false;
        source.CancelAfter(TimeSpan.FromMilliseconds(100));
        var second = reference.InvokeAsync<int>(Calls.Identifier, source.Token, RuntimeBoundary.Arguments).AsTask();
        RuntimeBoundary.Require(!second.IsCompleted, "Pooling control did not create its actual second pending operation.");
        try
        {
            await second.WaitAsync(TimeSpan.FromSeconds(5));
            throw new InvalidOperationException("Second pooled control did not cancel.");
        }
        catch (TaskCanceledException)
        {
            RuntimeBoundary.Require(second.IsCanceled, "Watchdog rather than the actual runtime operation produced cancellation.");
        }
        RuntimeBoundary.Require(retainedPooledToken.IsCancellationRequested && !originalCompletedToken.IsCancellationRequested,
            "Retained-token control did not distinguish generic reset/reuse from original lifetime.");
        runtime.Complete();

        return new
        {
            test = "GenericTryResetReuse_ChangesPreviouslyCompletedConsumerToken",
            actualResetSucceeded = reset, actualSecondRuntimeCallCanceled = second.IsCanceled,
            previousOriginalTokenCanceled = originalCompletedToken.IsCancellationRequested,
            previousPooledTokenCanceled = retainedPooledToken.IsCancellationRequested,
            pooledTokenIdentityReused = retainedPooledToken == reference.LastToken,
            conclusion = "A generic pool is not equivalent for a public IJSObjectReference consumer that retains a completed token. This is not a shipping candidate or benchmark speedup."
        };
    }

    private static List<ResourceObservation> ObserveResources()
    {
        const int count = 5000;
        var observations = new List<ResourceObservation>();
        foreach (var operation in Operations)
        {
            foreach (var policy in Enum.GetValues<TimeoutPolicy>())
            {
                using var runtime = new RuntimeBoundary { CompleteInline = true };
                var reference = runtime.CreateReference();
                for (var warmup = 0; warmup < 100; warmup++)
                {
                    RuntimeBoundary.Require(Calls.Run(operation, policy, ReplyTiming.Inline, runtime, reference) == RuntimeBoundary.Result, "Warmup result differs.");
                }
                var before = GC.GetAllocatedBytesForCurrentThread();
                var checksum = 0;
                for (var index = 0; index < count; index++)
                {
                    checksum += Calls.Run(operation, policy, ReplyTiming.Inline, runtime, reference);
                }
                var allocated = GC.GetAllocatedBytesForCurrentThread() - before;
                RuntimeBoundary.Require(checksum == count * RuntimeBoundary.Result, "Measured real-runtime completion batch skipped calls or returned a wrong value.");
                observations.Add(new($"InlineActualOwnerAllocation_{operation}_{policy}", operation, policy, count, checksum, allocated));
            }
        }

        return observations;
    }
}
