// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

namespace AutoPerf;

internal static class RenderPartialContracts
{
    public static readonly string[] Profiles = ["Sync.Completed32", "Async.Completed32", "Sync.Completed4096", "Async.Completed4096"];
    public const int AdditionalProducerContracts = 6;

    public static async Task RunAsync()
    {
        using var fixture = new RenderPartialFixture();
        foreach (var profile in Profiles)
        {
            var asynchronous = profile.StartsWith("Async.", StringComparison.Ordinal);
            using var request = fixture.CreateRequest(profile.EndsWith("4096", StringComparison.Ordinal) ? 4096 : 32, asynchronous);
            if (asynchronous)
            {
                await request.CallAsync().ConfigureAwait(false);
            }
            else
            {
                request.CallSync();
            }
            Evidence.Write("completed-producer", request.Capture(profile, success: true));
        }
        foreach (var outcome in new[] { "success", "failure", "cancellation" })
        {
            RunPendingSync(fixture, outcome);
            await RunPendingAsync(fixture, outcome).ConfigureAwait(false);
        }
    }

    private static void RunPendingSync(RenderPartialFixture fixture, string outcome)
    {
        using var gate = new RenderGate();
        using var request = fixture.CreateRequest(32, asynchronous: false, gate);
        using var finished = new ManualResetEventSlim();
        using var cancellation = new CancellationTokenSource();
        var expectedFailure = new InvalidOperationException("Actual pending partial Razor producer failure.");
        Exception? observedFailure = null;
        var worker = new Thread(() =>
        {
            try
            {
                request.CallSync();
            }
            catch (Exception exception)
            {
                observedFailure = exception;
            }
            finally
            {
                finished.Set();
            }
        })
        {
            IsBackground = true,
        };
        worker.Start();
        try
        {
            Evidence.Require(gate.Entered.Wait(TimeSpan.FromSeconds(10)), "The actual partial RazorPage producer was not reached.");
            var sampledState = worker.ThreadState;
            var observedWait = false;
            var reachedBoundary = SpinWait.SpinUntil(() =>
            {
                sampledState = worker.ThreadState;
                observedWait = (sampledState & ThreadState.WaitSleepJoin) != 0 &&
                    request.View.ActualRenderTask is { IsCompleted: false } &&
                    request.ActualOuterRenderTask is null && !request.ParentPage.PublicCallFinished && !finished.IsSet;

                return observedWait || finished.IsSet;
            }, TimeSpan.FromSeconds(10));
            var partialTask = request.View.ActualRenderTask;
            Evidence.Write("pending-sync-before-release", new
            {
                outcome,
                actualCallingThreadId = worker.ManagedThreadId,
                actualProducerThreadId = gate.ProducerThreadId,
                actualCallingThreadState = sampledState.ToString(),
                actualObservedPendingWait = observedWait,
                actualPublicCallFinished = request.ParentPage.PublicCallFinished,
                actualParentBeforeWritten = request.ParentPage.BeforeWritten,
                actualParentAfterWritten = request.ParentPage.AfterWritten,
                actualRootWriterText = request.Consumed,
                actualRootWriterDisposed = request.RootWriterDisposed,
                actualProducerTaskCompleted = gate.Completion.Task.IsCompleted,
                actualRealPartialRazorViewTaskCompleted = partialTask?.IsCompleted,
                actualOuterRenderTaskReturnedToHarness = request.ActualOuterRenderTask is not null,
                actualHarnessInvocationFinished = finished.IsSet,
                actualViewDisposeCalls = request.View.DisposeCalls,
                actualObservedFailure = observedFailure?.ToString(),
                directMockedHtmlHelperTask = false,
                fixedSleepUsed = false,
            });
            Evidence.Require(reachedBoundary && observedWait && !finished.IsSet && observedFailure is null &&
                !gate.Completion.Task.IsCompleted && partialTask is { IsCompleted: false } &&
                request.ActualOuterRenderTask is null && !request.ParentPage.PublicCallFinished &&
                request.ParentPage.BeforeWritten && !request.ParentPage.AfterWritten &&
                !request.RootWriterDisposed && !request.View.Page.Completed && request.View.DisposeCalls == 0 &&
                gate.ProducerThreadId == worker.ManagedThreadId,
                "The actual public synchronous RenderPartial invocation did not wait inside its real parent page.");
            Release(gate, outcome, expectedFailure, cancellation);
            Evidence.Require(worker.Join(TimeSpan.FromSeconds(10)), "Owned synchronous render did not finish after producer release.");
            CheckOutcome(outcome, observedFailure, expectedFailure, cancellation.Token, request);
            Evidence.Write("pending-sync-after-release", request.Capture("Sync.Pending." + outcome, success: outcome == "success"));
        }
        finally
        {
            gate.Completion.TrySetResult();
            Evidence.Require(worker.Join(TimeSpan.FromSeconds(10)), "Do not leave the owned diagnostic thread running.");
        }
    }

    private static async Task RunPendingAsync(RenderPartialFixture fixture, string outcome)
    {
        using var gate = new RenderGate();
        using var request = fixture.CreateRequest(32, asynchronous: true, gate);
        using var cancellation = new CancellationTokenSource();
        var expectedFailure = new InvalidOperationException("Actual pending partial Razor producer failure.");
        var caller = Environment.CurrentManagedThreadId;
        var operation = request.CallAsync();
        try
        {
            var partialTask = request.View.ActualRenderTask ?? throw new InvalidOperationException("Actual partial render task required.");
            var publicTask = request.ParentPage.ActualPublicTask ?? throw new InvalidOperationException("Actual public async task required.");
            Evidence.Require(gate.Entered.IsSet && !operation.IsCompleted && !partialTask.IsCompleted && !publicTask.IsCompleted &&
                !gate.Completion.Task.IsCompleted && ReferenceEquals(operation, request.ActualOuterRenderTask) &&
                request.ParentPage.BeforeWritten && !request.ParentPage.AfterWritten && !request.ParentPage.PublicCallFinished &&
                !request.RootWriterDisposed && !request.View.Page.Completed && request.View.DisposeCalls == 0 &&
                Environment.CurrentManagedThreadId == caller && gate.ProducerThreadId == caller,
                "Existing RenderPartialAsync did not return incomplete real tasks without finishing the parent page.");
            Evidence.Write("pending-async-before-release", new
            {
                outcome,
                actualCallingThreadId = caller,
                actualProducerThreadId = gate.ProducerThreadId,
                actualOuterRenderTaskReturnedToHarness = true,
                actualPublicTaskReturnedToParent = true,
                actualPublicTaskCompleted = publicTask.IsCompleted,
                actualOuterRenderTaskCompleted = operation.IsCompleted,
                actualRealPartialRazorViewTaskCompleted = partialTask.IsCompleted,
                actualPublicCallFinished = request.ParentPage.PublicCallFinished,
                actualParentBeforeWritten = request.ParentPage.BeforeWritten,
                actualParentAfterWritten = request.ParentPage.AfterWritten,
                actualRootWriterText = request.Consumed,
                actualRootWriterDisposed = request.RootWriterDisposed,
                actualViewDisposeCalls = request.View.DisposeCalls,
                directMockedHtmlHelperTask = false,
            });
            Release(gate, outcome, expectedFailure, cancellation);
            Exception? observedFailure = null;
            try
            {
                await operation.WaitAsync(TimeSpan.FromSeconds(10)).ConfigureAwait(false);
            }
            catch (Exception exception)
            {
                observedFailure = exception;
            }
            CheckOutcome(outcome, observedFailure, expectedFailure, cancellation.Token, request);
            Evidence.Write("pending-async-after-release", request.Capture("Async.Pending." + outcome, success: outcome == "success"));
        }
        finally
        {
            gate.Completion.TrySetResult();
            if (!operation.IsCompleted)
            {
                await operation.WaitAsync(TimeSpan.FromSeconds(10)).ConfigureAwait(false);
            }
        }
    }

    private static void Release(RenderGate gate, string outcome, Exception expectedFailure, CancellationTokenSource cancellation)
    {
        switch (outcome)
        {
            case "failure":
                gate.Completion.SetException(expectedFailure);
                break;
            case "cancellation":
                cancellation.Cancel();
                gate.Completion.SetCanceled(cancellation.Token);
                break;
            case "success":
                gate.Completion.SetResult();
                break;
            default:
                throw new InvalidOperationException("Unknown explicit producer outcome.");
        }
    }

    private static void CheckOutcome(string outcome, Exception? observedFailure, Exception expectedFailure,
        CancellationToken token, RenderPartialRequest request)
    {
        var publicFailure = request.ParentPage.PublicBoundaryFailure;
        var matches = outcome switch
        {
            "success" => observedFailure is null && publicFailure is null && request.Consumed == request.Expected,
            "failure" => ReferenceEquals(observedFailure, expectedFailure) && ReferenceEquals(publicFailure, expectedFailure),
            "cancellation" => observedFailure is OperationCanceledException canceled && canceled.CancellationToken == token &&
                publicFailure is OperationCanceledException publicCanceled && publicCanceled.CancellationToken == token,
            _ => throw new InvalidOperationException("Unknown producer outcome."),
        };
        Evidence.Require(matches, "The real parent/public/partial chain changed output,exact error identity or cancellation token.");
        Evidence.Write("pending-outcome", new
        {
            outcome,
            actualObservedExceptionType = observedFailure?.GetType().FullName,
            actualPublicBoundaryExceptionType = publicFailure?.GetType().FullName,
            actualExpectedOutcomeMatched = matches,
            actualOuterAndPublicExceptionReferenceMatched = outcome == "failure" &&
                ReferenceEquals(observedFailure, expectedFailure) && ReferenceEquals(publicFailure, expectedFailure),
            actualCancellationTokensMatched = outcome == "cancellation" &&
                observedFailure is OperationCanceledException observedCancellation && observedCancellation.CancellationToken == token &&
                publicFailure is OperationCanceledException publicCancellation && publicCancellation.CancellationToken == token,
            actualRootWriterText = request.Consumed,
            actualParentAfterWritten = request.ParentPage.AfterWritten,
        });
    }
}
