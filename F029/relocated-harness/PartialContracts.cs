using Microsoft.AspNetCore.Html;

namespace AutoPerf;

internal static class PartialContracts
{
    public static readonly string[] Profiles = ["Sync.Completed32", "Async.Completed32", "Sync.Completed4096", "Async.Completed4096"];
    public const int AdditionalProducerContracts = 6;

    public static async Task RunAsync()
    {
        using var fixture = new PartialFixture();
        foreach (var profile in Profiles)
        {
            using var request = fixture.CreateRequest(profile.EndsWith("4096", StringComparison.Ordinal) ? 4096 : 32);
            var content = profile.StartsWith("Async.", StringComparison.Ordinal) ? await request.CallAsync() : request.CallSync();
            Evidence.Require(request.Consume(content) == request.Expected.Length, "Actual completed producer consumption differs.");
            Evidence.Write("completed-producer", request.Capture(profile, success: true));
        }
        foreach (var outcome in new[] { "success", "failure", "cancellation" })
        {
            RunPendingSync(fixture, outcome);
            await RunPendingAsync(fixture, outcome);
        }
    }

    private static void RunPendingSync(PartialFixture fixture, string outcome)
    {
        using var gate = new RenderGate();
        using var request = fixture.CreateRequest(32, gate);
        using var returned = new ManualResetEventSlim();
        using var cancellation = new CancellationTokenSource();
        var expectedFailure = new InvalidOperationException("Actual pending Razor producer failure.");
        Exception? observedFailure = null;
        var consumed = -1;
        var worker = new Thread(() =>
        {
            try
            {
                var content = request.CallSync();
                consumed = request.Consume(content);
            }
            catch (Exception exception)
            {
                observedFailure = exception;
            }
            finally
            {
                returned.Set();
            }
        })
        {
            IsBackground = true,
        };
        worker.Start();
        try
        {
            Evidence.Require(gate.Entered.Wait(TimeSpan.FromSeconds(10)), "Actual RazorPage producer was not reached.");
            var sampledState = worker.ThreadState;
            var observedWait = false;
            var reachedBoundary = SpinWait.SpinUntil(() =>
            {
                sampledState = worker.ThreadState;
                observedWait = (sampledState & ThreadState.WaitSleepJoin) != 0 &&
                    request.View.ActualRenderTask is { IsCompleted: false } && !returned.IsSet;

                return observedWait || returned.IsSet;
            }, TimeSpan.FromSeconds(10));
            var rendererTask = request.View.ActualRenderTask;
            Evidence.Write("pending-sync-before-release", new
            {
                outcome, actualCallingThreadId = worker.ManagedThreadId, actualProducerThreadId = gate.ProducerThreadId,
                actualCallingThreadState = sampledState.ToString(), actualObservedPendingWait = observedWait,
                actualCallingThreadStateAfterSample = worker.ThreadState.ToString(), actualPublicCallReturned = returned.IsSet,
                actualProducerTaskCompleted = gate.Completion.Task.IsCompleted,
                actualRealRazorViewTaskCompleted = rendererTask?.IsCompleted,
                actualConsumed = consumed, actualViewDisposed = request.View.DisposeCalls,
                actualObservedFailure = observedFailure?.ToString(),
                directMockedHtmlHelperTask = false, fixedSleepUsed = false,
            });
            Evidence.Require(reachedBoundary && observedWait && !returned.IsSet && consumed == -1 && observedFailure is null &&
                !gate.Completion.Task.IsCompleted && !request.View.Page.Completed &&
                rendererTask is { IsCompleted: false } && request.View.DisposeCalls == 0 &&
                gate.ProducerThreadId == worker.ManagedThreadId,
                "The pending real render did not leave the public synchronous calling thread waiting.");
            Release(gate, outcome, expectedFailure, cancellation);
            Evidence.Require(worker.Join(TimeSpan.FromSeconds(10)), "Actual synchronous render failed to finish after producer release.");
            CheckOutcome(outcome, observedFailure, expectedFailure, cancellation.Token, consumed, request);
            Evidence.Write("pending-sync-after-release", request.Capture("Sync.Pending." + outcome, outcome == "success"));
        }
        finally
        {
            gate.Completion.TrySetResult();
            Evidence.Require(worker.Join(TimeSpan.FromSeconds(10)), "Do not leave the owned diagnostic thread running.");
        }
    }

    private static async Task RunPendingAsync(PartialFixture fixture, string outcome)
    {
        using var gate = new RenderGate();
        using var request = fixture.CreateRequest(32, gate);
        using var cancellation = new CancellationTokenSource();
        var expectedFailure = new InvalidOperationException("Actual pending Razor producer failure.");
        var caller = Environment.CurrentManagedThreadId;
        Task<IHtmlContent> operation = request.CallAsync();
        try
        {
            var rendererTask = request.View.ActualRenderTask ?? throw new InvalidOperationException("Actual RazorView task required.");
            Evidence.Require(gate.Entered.IsSet && !operation.IsCompleted && !gate.Completion.Task.IsCompleted &&
                !rendererTask.IsCompleted && !request.View.Page.Completed &&
                request.View.DisposeCalls == 0 && Environment.CurrentManagedThreadId == caller &&
                gate.ProducerThreadId == caller, "Existing async API did not return an incomplete actual render task to its caller.");
            Evidence.Write("pending-async-before-release", new
            {
                outcome, actualCallingThreadId = caller, actualProducerThreadId = gate.ProducerThreadId,
                actualPublicCallReturned = true, actualPublicTaskCompleted = operation.IsCompleted,
                actualProducerTaskCompleted = gate.Completion.Task.IsCompleted,
                actualRealRazorViewTaskCompleted = rendererTask.IsCompleted,
                actualViewDisposed = request.View.DisposeCalls, directMockedHtmlHelperTask = false,
            });
            Release(gate, outcome, expectedFailure, cancellation);
            Exception? observedFailure = null;
            var consumed = -1;
            try
            {
                consumed = request.Consume(await operation.WaitAsync(TimeSpan.FromSeconds(10)));
            }
            catch (Exception exception)
            {
                observedFailure = exception;
            }
            CheckOutcome(outcome, observedFailure, expectedFailure, cancellation.Token, consumed, request);
            Evidence.Write("pending-async-after-release", request.Capture("Async.Pending." + outcome, outcome == "success"));
        }
        finally
        {
            gate.Completion.TrySetResult();
            if (!operation.IsCompleted)
            {
                await operation.WaitAsync(TimeSpan.FromSeconds(10));
            }
        }
    }

    private static void Release(RenderGate gate, string outcome, Exception expectedFailure, CancellationTokenSource cancellation)
    {
        if (outcome == "failure")
        {
            gate.Completion.SetException(expectedFailure);
        }
        else if (outcome == "cancellation")
        {
            cancellation.Cancel();
            gate.Completion.SetCanceled(cancellation.Token);
        }
        else
        {
            gate.Completion.SetResult();
        }
    }

    private static void CheckOutcome(string outcome, Exception? observedFailure, Exception expectedFailure,
        CancellationToken token, int consumed, PartialRequest request)
    {
        var matches = outcome switch
        {
            "success" => observedFailure is null && consumed == request.Expected.Length,
            "failure" => ReferenceEquals(observedFailure, expectedFailure) && consumed == -1,
            "cancellation" => observedFailure is OperationCanceledException canceled &&
                canceled.CancellationToken == token && consumed == -1,
            _ => false,
        };
        Evidence.Require(matches, "The real pending producer did not preserve the exact result/unwrapped exception/cancellation token.");
        Evidence.Write("pending-outcome", new
        {
            outcome, actualObservedExceptionType = observedFailure?.GetType().FullName,
            actualExceptionMessage = observedFailure?.Message, actualExpectedOutcomeMatched = matches,
            actualReferenceMatched = outcome == "failure" && ReferenceEquals(observedFailure, expectedFailure),
            actualCancellationTokenMatched = outcome == "cancellation" &&
                observedFailure is OperationCanceledException exception && exception.CancellationToken == token,
            actualConsumed = consumed,
        });
    }
}
