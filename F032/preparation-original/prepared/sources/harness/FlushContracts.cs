// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

namespace AutoPerf;

internal static class FlushContracts
{
    internal static readonly string[] Profiles =
    [
        "Request.Sync.None.1", "Request.Sync.Ready.1", "Request.Sync.Ready.64",
        "Request.Async.Ready.1", "Live.Sync.Started", "Live.Async.Started",
    ];
    internal const int AdditionalProducerContracts = 12;

    internal static async Task RunAsync()
    {
        await using var fixture = new HttpSysFixture();
        await fixture.StartAsync().ConfigureAwait(false);
        foreach (var profile in Profiles)
        {
            await using var request = fixture.Begin(FlushPlan.Create(profile));
            if (request.Plan.Live)
            {
                await request.Plan.LiveReady.Task.WaitAsync(FlushPlan.Timeout).ConfigureAwait(false);
                await request.Headers.WaitAsync(FlushPlan.Timeout).ConfigureAwait(false);
                Evidence.Require(!request.Plan.ApplicationFinished.Task.IsCompleted, "Prepared actual request must still be alive.");
                for (var index = 0; index < 64; index++)
                {
                    if (request.Plan.Async)
                    {
                        await request.Plan.Context.Response.Body.FlushAsync(CancellationToken.None).ConfigureAwait(false);
                    }
                    else
                    {
                        request.Plan.Context.Response.Body.Flush();
                    }
                }
                Evidence.Require(!request.Plan.ApplicationFinished.Task.IsCompleted, "Repeated flush must not complete the held native request.");
                Evidence.Write("completed-live-before-release", request.Plan.Capture());
                request.Plan.Release();
            }
            await request.ConsumeAsync().ConfigureAwait(false);
            RequireSuccessfulCallbacks(request);
            Evidence.Write("completed-profile", request.Capture());
        }
        foreach (var asyncControl in new[] { false, true })
        {
            foreach (var kind in new[] { CallbackKind.PendingSuccess, CallbackKind.PendingFailure, CallbackKind.PendingCancellation })
            {
                await VerifyPendingAsync(fixture, asyncControl, kind, allowSync: true).ConfigureAwait(false);
            }
        }
        foreach (var kind in new[] { CallbackKind.AlreadyFaulted, CallbackKind.AlreadyCanceled })
        {
            await using var request = fixture.Begin(new FlushPlan { Profile = "Already." + kind, Callback = kind });
            await request.ConsumeAsync().ConfigureAwait(false);
            RequireExpectedFailure(request.Plan);
            Evidence.Require(request.Plan.HeadersReadOnlyAfterInvocation == false, "Failed start must not be relabeled as successfully locked.");
            Evidence.Write("already-failed-producer", request.Capture());
        }
        await VerifyPendingAsync(fixture, asyncControl: false, CallbackKind.PendingSuccess, allowSync: false).ConfigureAwait(false);
        await using (var disabled = fixture.Begin(new FlushPlan { Profile = "Default.Sync.Disabled", AllowSynchronousIO = false }))
        {
            await disabled.ConsumeAsync().ConfigureAwait(false);
            RequireDisabled(disabled.Plan);
            Evidence.Write("default-sync-disabled", disabled.Capture());
        }
        await using (var completed = fixture.Begin(new FlushPlan { Profile = "Async.Completed", Async = true }))
        {
            await completed.ConsumeAsync().ConfigureAwait(false);
            RequireSuccessfulCallbacks(completed);
            Evidence.Write("completed-async-control", completed.Capture());
        }
        await using (var noCallback = fixture.Begin(new FlushPlan { Profile = "Async.NoCallback", Async = true, Callback = CallbackKind.None }))
        {
            await noCallback.ConsumeAsync().ConfigureAwait(false);
            RequireSuccessfulCallbacks(noCallback);
            Evidence.Write("no-callback-async-control", noCallback.Capture());
        }
    }

    private static async Task VerifyPendingAsync(HttpSysFixture fixture, bool asyncControl, CallbackKind kind, bool allowSync)
    {
        var label = $"{(asyncControl ? "Async" : "Sync")}.{kind}.{(allowSync ? "Enabled" : "DefaultDisabled")}";
        await using var request = fixture.Begin(new FlushPlan
        {
            Profile = label,
            Callback = kind,
            Async = asyncControl,
            AllowSynchronousIO = allowSync,
        });
        var plan = request.Plan;
        await plan.CallbackEntered.Task.WaitAsync(FlushPlan.Timeout).ConfigureAwait(false);
        Evidence.Require(SpinWait.SpinUntil(() => plan.ActualCallbackTask is not null &&
            (asyncControl ? plan.ActualAsyncFlushTask is not null :
                plan.CallingThread is { } thread && (thread.ThreadState & ThreadState.WaitSleepJoin) != 0), FlushPlan.Timeout),
            "Observe the actual returned async task or server thread waiting inside synchronous Flush.");
        Evidence.Require(plan.ActualCallbackTask is { IsCompleted: false } && !plan.InvocationFinished &&
            !plan.ApplicationFinished.Task.IsCompleted && !request.Headers.IsCompleted,
            "Actual pending callback,public Flush and wire headers must remain incomplete before producer release.");
        Evidence.Require(plan.Context.Response.HasStarted && !plan.Context.Response.Headers.IsReadOnly &&
            plan.CallbackOrder.SequenceEqual(["new-enter"]), "Preserve actual pre-await HasStarted and unlocked pending-start headers.");
        if (asyncControl)
        {
            Evidence.Require(plan.ActualAsyncFlushTask is { IsCompleted: false }, "Actual public FlushAsync must have returned incomplete.");
        }
        Evidence.Write("pending-before-release", new
        {
            profile = label,
            actualPlan = plan.Capture(),
            actualClientHeadersReturned = request.Headers.IsCompleted,
            actualSynchronousCallerWaiting = !asyncControl,
        });
        plan.Release();
        await request.ConsumeAsync().ConfigureAwait(false);
        if (!allowSync)
        {
            RequireDisabled(plan);
        }
        else if (kind is CallbackKind.PendingSuccess)
        {
            RequireSuccessfulCallbacks(request);
        }
        else
        {
            RequireExpectedFailure(plan);
            Evidence.Require(plan.HeadersReadOnlyAfterInvocation == false, "Faulted start must retain its actual unlocked-header boundary.");
        }
        Evidence.Write("pending-after-release", request.Capture());
    }

    private static void RequireSuccessfulCallbacks(RequestHandle request)
    {
        var plan = request.Plan;
        Evidence.Require(plan.InvocationFinished && plan.InvocationSucceeded && plan.InvocationError is null &&
            plan.HeadersReadOnlyAfterInvocation == true && request.ActualWireSuccess, "Actual successful Flush and complete wire result required.");
        if (plan.Callback is CallbackKind.None)
        {
            Evidence.Require(plan.CallbackOrder.IsEmpty && request.ActualWireStartingHeader is null &&
                request.ActualWireOrderHeader is null, "No-callback control must not fabricate callback work.");
        }
        else
        {
            Evidence.Require(plan.CallbackOrder.SequenceEqual(["new-enter", "new-exit", "old"]) &&
                request.ActualWireStartingHeader == "ready" && request.ActualWireOrderHeader == "new-enter,new-exit,old",
                "Actual LIFO callbacks and callback-produced native response headers differ.");
        }
    }

    private static void RequireExpectedFailure(FlushPlan plan)
    {
        Evidence.Require(plan.InvocationFinished && !plan.InvocationSucceeded && plan.CallbackOrder.SequenceEqual(["new-enter"]),
            "Expected callback failure must prevent successful public return and older callback execution.");
        if (plan.Callback is CallbackKind.PendingFailure or CallbackKind.AlreadyFaulted)
        {
            Evidence.Require(ReferenceEquals(plan.InvocationError, plan.ExpectedFailure), "Actual public Flush must preserve the original exception reference.");
        }
        else
        {
            Evidence.Require(plan.InvocationError is OperationCanceledException canceled && canceled.CancellationToken == plan.ProducerToken,
                "Actual public Flush must preserve the callback producer's cancellation token.");
        }
    }

    private static void RequireDisabled(FlushPlan plan)
    {
        Evidence.Require(plan.InvocationFinished && !plan.InvocationSucceeded && plan.InvocationError is InvalidOperationException error &&
            error.Message.Contains("Synchronous IO APIs are disabled", StringComparison.Ordinal) &&
            plan.HeadersReadOnlyAfterInvocation == true &&
            plan.CallbackOrder.SequenceEqual(["new-enter", "new-exit", "old"]),
            "Default IO rejection occurs after actual OnStarting completion and must not be bypassed.");
    }
}
