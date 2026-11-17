// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

namespace AutoPerf;

internal static class WriteContracts
{
    internal static readonly string[] Profiles =
    [
        "Request.Sync.None.128", "Request.Sync.Ready.128", "Request.Sync.Ready.4096",
        "Request.Async.Ready.128", "Live.Sync.Started.Zero", "Live.Async.Started.Zero",
    ];
    internal const int AdditionalProducerContracts = 22;

    internal static async Task RunAsync()
    {
        var fixture = new HttpSysFixture();
        await using var fixtureLifetime = fixture.ConfigureAwait(false);
        await fixture.StartAsync().ConfigureAwait(false);
        foreach (var profile in Profiles)
        {
            var request = fixture.Begin(WritePlan.Create(profile));
            await using var requestLifetime = request.ConfigureAwait(false);
            if (request.Plan.Live)
            {
                await request.Plan.LiveReady.Task.WaitAsync(WritePlan.Timeout).ConfigureAwait(false);
                await request.Headers.WaitAsync(WritePlan.Timeout).ConfigureAwait(false);
                Evidence.Require(!request.Plan.ApplicationFinished.Task.IsCompleted, "Prepared actual request must still be alive.");
                for (var index = 0; index < 64; index++)
                {
                    if (request.Plan.Async)
                    {
                        await request.Plan.Context.Response.Body.WriteAsync(
                            WritePlan.EmptyBuffer.AsMemory(WritePlan.BufferOffset, 0), CancellationToken.None).ConfigureAwait(false);
                    }
                    else
                    {
                        request.Plan.Context.Response.Body.Write(WritePlan.EmptyBuffer, WritePlan.BufferOffset, 0);
                    }
                }
                Evidence.Require(!request.Plan.ApplicationFinished.Task.IsCompleted, "Repeated zero-byte writes must not complete the held native request.");
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
            var request = fixture.Begin(new WritePlan { Profile = "Already." + kind, Callback = kind });
            await using var requestLifetime = request.ConfigureAwait(false);
            await request.ConsumeAsync().ConfigureAwait(false);
            RequireExpectedFailure(request.Plan);
            Evidence.Require(request.Plan.HeadersReadOnlyAfterInvocation == false, "Failed start must not be relabeled as successfully locked.");
            Evidence.Write("already-failed-producer", request.Capture());
        }
        await VerifyPendingAsync(fixture, asyncControl: false, CallbackKind.PendingSuccess, allowSync: false).ConfigureAwait(false);
        var disabled = fixture.Begin(new WritePlan { Profile = "Default.Sync.Disabled", AllowSynchronousIO = false });
        await using (disabled.ConfigureAwait(false))
        {
            await disabled.ConsumeAsync().ConfigureAwait(false);
            RequireDisabled(disabled.Plan);
            Evidence.Write("default-sync-disabled", disabled.Capture());
        }
        var completed = fixture.Begin(new WritePlan { Profile = "Async.Completed", Async = true });
        await using (completed.ConfigureAwait(false))
        {
            await completed.ConsumeAsync().ConfigureAwait(false);
            RequireSuccessfulCallbacks(completed);
            Evidence.Write("completed-async-control", completed.Capture());
        }
        var noCallback = fixture.Begin(new WritePlan { Profile = "Async.NoCallback", Async = true, Callback = CallbackKind.None });
        await using (noCallback.ConfigureAwait(false))
        {
            await noCallback.ConsumeAsync().ConfigureAwait(false);
            RequireSuccessfulCallbacks(noCallback);
            Evidence.Write("no-callback-async-control", noCallback.Capture());
        }
        foreach (var arguments in new[] { BufferCase.Null, BufferCase.NegativeOffset, BufferCase.NegativeCount, BufferCase.PastEnd })
        {
            await VerifyArgumentsAsync(fixture, arguments, allowSync: true).ConfigureAwait(false);
        }
        foreach (var kind in new[] { CallbackKind.PendingSuccess, CallbackKind.PendingFailure, CallbackKind.PendingCancellation })
        {
            await VerifyPendingAsync(fixture, asyncControl: false, kind, allowSync: true, BufferCase.NegativeCount).ConfigureAwait(false);
        }
        await VerifyArgumentsAsync(fixture, BufferCase.PastEnd, allowSync: false).ConfigureAwait(false);
        foreach (var asyncControl in new[] { false, true })
        {
            var zero = fixture.Begin(new WritePlan
            {
                Profile = asyncControl ? "Zero.First.Async" : "Zero.First.Sync",
                Async = asyncControl,
                PayloadLength = 0,
            });
            await using var zeroLifetime = zero.ConfigureAwait(false);
            await zero.ConsumeAsync().ConfigureAwait(false);
            RequireSuccessfulCallbacks(zero);
            Evidence.Write("zero-first-write", zero.Capture());
        }
    }

    internal static async Task RunBenchmarkLifecycleAsync()
    {
        foreach (var profile in Profiles)
        {
            var benchmark = new WriteBenchmarks { Profile = profile };
            int actualResult;
            try
            {
                benchmark.Setup();
                actualResult = await benchmark.WriteAndConsumeAsync().ConfigureAwait(false);
                var expected = profile.StartsWith("Live.", StringComparison.Ordinal) ? 1 :
                    (profile.EndsWith(".4096", StringComparison.Ordinal) ? 4096 : 128) + WritePlan.SuccessPayload.Length;
                Evidence.Require(actualResult == expected,
                    "The actual synchronous benchmark setup must finish before the workload and consume the expected boundary.");
            }
            finally
            {
                benchmark.Cleanup();
            }
            Evidence.Write("benchmark-lifecycle-characterized", new
            {
                profile,
                actualResult,
                actualSetupReturnedBeforeWorkload = true,
                actualCleanupReturnedAfterWireConsumptionAndHostDisposal = true,
                timing = false,
            });
        }
    }

    private static async Task VerifyPendingAsync(HttpSysFixture fixture, bool asyncControl, CallbackKind kind, bool allowSync,
        BufferCase arguments = BufferCase.Valid)
    {
        var label = $"{(asyncControl ? "Async" : "Sync")}.{kind}.{(allowSync ? "Enabled" : "DefaultDisabled")}.{arguments}";
        var request = fixture.Begin(new WritePlan
        {
            Profile = label,
            Callback = kind,
            Async = asyncControl,
            AllowSynchronousIO = allowSync,
            Arguments = arguments,
        });
        await using var requestLifetime = request.ConfigureAwait(false);
        var plan = request.Plan;
        await plan.CallbackEntered.Task.WaitAsync(WritePlan.Timeout).ConfigureAwait(false);
        Evidence.Require(SpinWait.SpinUntil(() => plan.ActualCallbackTask is not null &&
            (asyncControl ? plan.ActualAsyncWriteTask is not null :
                plan.CallingThread is { } thread && (thread.ThreadState & ThreadState.WaitSleepJoin) != 0), WritePlan.Timeout),
            "Observe the actual returned async task or server thread waiting inside synchronous Write.");
        Evidence.Require(plan.ActualCallbackTask is { IsCompleted: false } && !plan.InvocationFinished &&
            !plan.ApplicationFinished.Task.IsCompleted && !request.Headers.IsCompleted,
            "Actual pending callback,public Write and wire headers must remain incomplete before producer release.");
        Evidence.Require(plan.Context.Response.HasStarted && !plan.Context.Response.Headers.IsReadOnly &&
            plan.CallbackOrder.SequenceEqual(["new-enter"]), "Preserve actual pre-await HasStarted and unlocked pending-start headers.");
        if (asyncControl)
        {
            Evidence.Require(plan.ActualAsyncWriteTask is { IsCompleted: false }, "Actual public WriteAsync must have returned incomplete.");
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
        if (kind is CallbackKind.PendingFailure or CallbackKind.PendingCancellation)
        {
            RequireExpectedFailure(plan);
            Evidence.Require(plan.HeadersReadOnlyAfterInvocation == false, "Faulted start must retain its actual unlocked-header boundary.");
        }
        else if (arguments is not BufferCase.Valid)
        {
            RequireArgumentFailure(plan);
        }
        else if (!allowSync)
        {
            RequireDisabled(plan);
        }
        else if (kind is CallbackKind.PendingSuccess)
        {
            RequireSuccessfulCallbacks(request);
        }
        Evidence.Write("pending-after-release", request.Capture());
    }

    private static async Task VerifyArgumentsAsync(HttpSysFixture fixture, BufferCase arguments, bool allowSync)
    {
        var request = fixture.Begin(new WritePlan
        {
            Profile = $"Arguments.{arguments}.{(allowSync ? "Enabled" : "DefaultDisabled")}",
            Arguments = arguments,
            AllowSynchronousIO = allowSync,
        });
        await using var requestLifetime = request.ConfigureAwait(false);
        await request.ConsumeAsync().ConfigureAwait(false);
        RequireArgumentFailure(request.Plan);
        Evidence.Write("invalid-arguments-after-start", request.Capture());
    }

    private static void RequireArgumentFailure(WritePlan plan)
    {
        Evidence.Write("invalid-arguments-observed", plan.Capture());
        var matchesArgumentContract = plan.Arguments switch
        {
            BufferCase.Null => plan.InvocationError is ArgumentNullException { ParamName: "buffer" },
            BufferCase.NegativeOffset => plan.InvocationError is ArgumentOutOfRangeException { ParamName: "offset" },
            BufferCase.NegativeCount => plan.InvocationError is ArgumentOutOfRangeException { ParamName: "count" },
            BufferCase.PastEnd => plan.InvocationError is ArgumentException,
            _ => throw new InvalidOperationException("An invalid buffer argument is required."),
        };
        Evidence.Require(plan.InvocationFinished && !plan.InvocationSucceeded &&
            matchesArgumentContract &&
            plan.HeadersReadOnlyAfterInvocation == true &&
            plan.CallbackOrder.SequenceEqual(["new-enter", "new-exit", "old"]),
            "Actual OnStarting must finish before native argument validation,which precedes synchronous-IO rejection;concrete error type/parameter are retained for exact cross-variant comparison.");
    }

    private static void RequireSuccessfulCallbacks(RequestHandle request)
    {
        var plan = request.Plan;
        Evidence.Require(plan.InvocationFinished && plan.InvocationSucceeded && plan.InvocationError is null &&
            plan.HeadersReadOnlyAfterInvocation == true && request.ActualWireSuccess, "Actual successful ranged Write and complete wire result required.");
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

    private static void RequireExpectedFailure(WritePlan plan)
    {
        Evidence.Require(plan.InvocationFinished && !plan.InvocationSucceeded && plan.CallbackOrder.SequenceEqual(["new-enter"]),
            "Expected callback failure must prevent successful public return and older callback execution.");
        if (plan.Callback is CallbackKind.PendingFailure or CallbackKind.AlreadyFaulted)
        {
            Evidence.Require(ReferenceEquals(plan.InvocationError, plan.ExpectedFailure), "Actual public Write must preserve the original exception reference.");
        }
        else
        {
            Evidence.Require(plan.InvocationError is OperationCanceledException canceled && canceled.CancellationToken == plan.ProducerToken,
                "Actual public Write must preserve the callback producer's cancellation token.");
        }
    }

    private static void RequireDisabled(WritePlan plan)
    {
        Evidence.Require(plan.InvocationFinished && !plan.InvocationSucceeded && plan.InvocationError is InvalidOperationException error &&
            error.Message.Contains("Synchronous IO APIs are disabled", StringComparison.Ordinal) &&
            plan.HeadersReadOnlyAfterInvocation == true &&
            plan.CallbackOrder.SequenceEqual(["new-enter", "new-exit", "old"]),
            "Default IO rejection occurs after actual OnStarting completion and must not be bypassed.");
    }
}
