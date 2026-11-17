// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

namespace AutoPerf;

internal static class TemplateContracts
{
    public static readonly string[] Profiles =
    [
        "Display.Completed32", "Display.Default32", "Editor.Completed32",
        "Display.Completed4096", "Display.Default4096", "Editor.Completed4096",
    ];
    public const int AdditionalProducerContracts = 12;

    public static void Run()
    {
        using var fixture = new TemplateFixture();
        foreach (var profile in Profiles)
        {
            using var request = fixture.CreateRequest(profile);
            request.Call();
            Evidence.Write("completed-producer", request.Capture(profile, success: true));
        }
        foreach (var api in new[] { "Display", "Editor" })
        {
            using (var fallback = fixture.CreateRequest(api + ".Completed32", findFallback: true))
            {
                fallback.Call();
                Evidence.Write("lookup-fallback", fallback.Capture(api + ".FindView", success: true));
            }
            foreach (var outcome in new[] { "failure", "cancellation" })
            {
                RunAlreadyCompletedFailure(fixture, api, outcome);
            }
            foreach (var outcome in new[] { "success", "failure", "cancellation" })
            {
                RunPending(fixture, api, outcome);
            }
        }
    }

    private static void RunAlreadyCompletedFailure(TemplateFixture fixture, string api, string outcome)
    {
        using var gate = new TemplateGate();
        using var cancellation = new CancellationTokenSource();
        var expectedFailure = new InvalidOperationException("Actual already-completed Razor template producer failure.");
        Release(gate, outcome, expectedFailure, cancellation);
        using var request = fixture.CreateRequest(api + ".Completed32", gate);
        Exception? observedFailure = null;
        try
        {
            request.Call();
        }
        catch (Exception exception)
        {
            observedFailure = exception;
        }
        Evidence.Require(gate.Entered.IsSet && gate.Completion.Task.IsCompleted &&
            request.View.ActualRenderTask is { IsCompleted: true, IsCompletedSuccessfully: false },
            "Actual custom template must return its already-failed real RazorView task.");
        CheckOutcome(api + ".AlreadyCompleted", outcome, observedFailure, expectedFailure, cancellation.Token, request);
        Evidence.Write("already-completed-failure", request.Capture(api + ".AlreadyCompleted." + outcome, success: false));
    }

    private static void RunPending(TemplateFixture fixture, string api, string outcome)
    {
        using var gate = new TemplateGate();
        using var request = fixture.CreateRequest(api + ".Completed32", gate);
        using var finished = new ManualResetEventSlim();
        using var cancellation = new CancellationTokenSource();
        var expectedFailure = new InvalidOperationException("Actual pending Razor template producer failure.");
        Exception? observedFailure = null;
        var worker = new Thread(() =>
        {
            try
            {
                request.Call();
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
            Evidence.Require(gate.Entered.Wait(TimeSpan.FromSeconds(10)), "The actual Razor template producer was not reached.");
            var sampledState = worker.ThreadState;
            var observedWait = false;
            var reachedBoundary = SpinWait.SpinUntil(() =>
            {
                sampledState = worker.ThreadState;
                observedWait = (sampledState & ThreadState.WaitSleepJoin) != 0 &&
                    request.View.ActualRenderTask is { IsCompleted: false } &&
                    !request.PublicCallFinished && !finished.IsSet;

                return observedWait || finished.IsSet;
            }, TimeSpan.FromSeconds(10));
            Evidence.Write("pending-before-release", new
            {
                api,
                outcome,
                actualCallingThreadId = worker.ManagedThreadId,
                actualProducerThreadId = gate.ProducerThreadId,
                actualCallingThreadState = sampledState.ToString(),
                actualObservedPendingWait = observedWait,
                actualPublicCallFinished = request.PublicCallFinished,
                actualReturnedContentType = request.ReturnedContent?.GetType().FullName,
                actualRootWriterText = request.Consumed,
                actualRootWriterDisposed = request.RootWriterDisposed,
                actualProducerTaskCompleted = gate.Completion.Task.IsCompleted,
                actualRealRazorViewTaskCompleted = request.View.ActualRenderTask?.IsCompleted,
                actualViewDisposeCalls = request.View.DisposeCalls,
                actualHarnessInvocationFinished = finished.IsSet,
                harnessContainsTaskWait = false,
                fixedSleepUsed = false,
            });
            Evidence.Require(reachedBoundary && observedWait && !finished.IsSet && observedFailure is null &&
                !gate.Completion.Task.IsCompleted && request.View.ActualRenderTask is { IsCompleted: false } &&
                !request.PublicCallFinished && request.ReturnedContent is null && request.Consumed == "before|" &&
                !request.RootWriterDisposed && !request.View.Page.Completed && request.View.DisposeCalls == 0 &&
                gate.ProducerThreadId == worker.ManagedThreadId,
                "The actual synchronous Display/Editor call must wait on its page-owned real RazorView producer, not a harness task.");
            Release(gate, outcome, expectedFailure, cancellation);
            Evidence.Require(worker.Join(TimeSpan.FromSeconds(10)), "Owned synchronous template invocation did not finish after release.");
            CheckOutcome(api + ".Pending", outcome, observedFailure, expectedFailure, cancellation.Token, request);
            Evidence.Write("pending-after-release", request.Capture(api + ".Pending." + outcome, success: outcome == "success"));
        }
        finally
        {
            gate.Completion.TrySetResult();
            Evidence.Require(worker.Join(TimeSpan.FromSeconds(10)), "Do not leave the owned diagnostic thread running.");
        }
    }

    private static void Release(TemplateGate gate, string outcome, Exception expectedFailure, CancellationTokenSource cancellation)
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

    private static void CheckOutcome(string api, string outcome, Exception? observedFailure, Exception expectedFailure,
        CancellationToken token, TemplateRequest request)
    {
        var publicFailure = request.PublicBoundaryFailure;
        var matches = outcome switch
        {
            "success" => observedFailure is null && publicFailure is null && request.Consumed == request.Expected,
            "failure" => ReferenceEquals(observedFailure, expectedFailure) && ReferenceEquals(publicFailure, expectedFailure),
            "cancellation" => observedFailure is OperationCanceledException canceled && canceled.CancellationToken == token &&
                publicFailure is OperationCanceledException publicCanceled && publicCanceled.CancellationToken == token,
            _ => throw new InvalidOperationException("Unknown producer outcome."),
        };
        Evidence.Require(matches, "The actual template changed completed output, exact error identity or cancellation token.");
        Evidence.Write("producer-outcome", new
        {
            api,
            outcome,
            actualObservedExceptionType = observedFailure?.GetType().FullName,
            actualPublicBoundaryExceptionType = publicFailure?.GetType().FullName,
            actualExpectedOutcomeMatched = matches,
            actualExceptionReferenceMatched = outcome == "failure" &&
                ReferenceEquals(observedFailure, expectedFailure) && ReferenceEquals(publicFailure, expectedFailure),
            actualCancellationTokensMatched = outcome == "cancellation" &&
                observedFailure is OperationCanceledException observedCancellation && observedCancellation.CancellationToken == token &&
                publicFailure is OperationCanceledException publicCancellation && publicCancellation.CancellationToken == token,
        });
    }
}
