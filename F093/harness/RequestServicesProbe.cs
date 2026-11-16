using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

public static class RequestServicesProbe
{
    private static void Require([DoesNotReturnIf(false)] bool condition, string failure)
    {
        if (!condition)
        {
            throw new InvalidOperationException(failure);
        }
    }

    public static async Task VerifyAsync(string artifacts)
    {
        var observations = new List<object>();
        foreach (var kind in new[] { ResourceKind.Async, ResourceKind.Dual })
        {
            foreach (var fail in new[] { false, true })
            {
                using var lifecycle = new RequestServicesLifecycle(new DisposalProfile(kind.ToString(), kind, 1));
                using var entered = new ManualResetEventSlim();
                var state = lifecycle.Prepare(new CallState
                {
                    Fail = fail,
                    PendingEntered = entered,
                    Release = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously)
                });
                Exception? observed = null;
                var worker = new Thread(() =>
                {
                    try
                    {
                        state.Owner!.Dispose();
                    }
                    catch (Exception error)
                    {
                        observed = error;
                    }
                }) { IsBackground = true };
                worker.Start();
                var waited = false;
                try
                {
                    Require(entered.Wait(TimeSpan.FromSeconds(10)), "Actual scoped async cleanup never started.");
                    var limit = Stopwatch.StartNew();
                    while (limit.Elapsed < TimeSpan.FromSeconds(10))
                    {
                        if ((worker.ThreadState & System.Threading.ThreadState.WaitSleepJoin) != 0)
                        {
                            waited = true;
                            break;
                        }
                        Thread.Yield();
                    }
                    Require(waited && ReferenceEquals(state.Owner!.RequestServices, state.Provider) &&
                        state.CompletedCalls == 0 && state.SyncCalls == 0,
                        "Pending synchronous caller/reference/actual async preference was not observed.");
                }
                finally
                {
                    state.Release!.TrySetResult(true);
                    Require(worker.Join(TimeSpan.FromSeconds(10)), "Actual synchronous disposal worker did not terminate.");
                }
                Require(fail ? observed is InvalidOperationException { Message: "actual scoped cleanup failed", InnerException: null } : observed is null,
                    "Pending cleanup exception was lost, wrapped or changed.");
                Require(fail ? ReferenceEquals(state.Owner!.RequestServices, state.Provider) : state.Owner!.RequestServices is null,
                    "Actual failed/successful reference clearing changed.");
                observations.Add(new { scenario = $"PendingSync{kind}{(fail ? "Fault" : "Success")}",
                    actual_worker_waited_before_producer = waited, references_retained_while_pending = true,
                    async_calls = state.AsyncCalls, sync_calls = state.SyncCalls, completed_calls = state.CompletedCalls,
                    exception_type = observed?.GetType().FullName, exception_message = observed?.Message,
                    references_retained_after_fault = fail });
                state.Owner!.Dispose();
                Require(state.Owner.RequestServices is null && state.AsyncCalls == 1, "Repeated actual disposal did not clear references once.");
                lifecycle.End(state);
            }
        }
        using (var lifecycle = new RequestServicesLifecycle(new DisposalProfile("Async", ResourceKind.Async, 1)))
        {
            using var entered = new ManualResetEventSlim();
            var state = lifecycle.Prepare(new CallState
            {
                PendingEntered = entered,
                Release = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously)
            });
            var task = state.Owner!.DisposeAsync();
            Require(entered.Wait(TimeSpan.FromSeconds(10)) && !task.IsCompleted &&
                ReferenceEquals(state.Owner.RequestServices, state.Provider), "Actual async caller did not return pending with references intact.");
            state.Release!.SetResult(true);
            await task;
            lifecycle.CaptureAndValidate(state, publicRequest: false);
            lifecycle.End(state);
            observations.Add(new { scenario = "PendingAsyncReturns", returned_incomplete_before_real_release = true,
                completed_calls = state.CompletedCalls, provider_cleared = state.ProviderCleared });
        }
        using (var lifecycle = new RequestServicesLifecycle(new DisposalProfile("Async", ResourceKind.Async, 1)))
        {
            using var entered = new ManualResetEventSlim();
            var state = new CallState
            {
                PendingEntered = entered,
                Release = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously)
            };
            var request = lifecycle.RunPublicAsync(explicitSync: false, state);
            Require(entered.Wait(TimeSpan.FromSeconds(10)), "Actual registered response cleanup never started.");
            Require(!state.ResponseCompleted.Task.IsCompleted && state.CompletedCalls == 0 &&
                ReferenceEquals(state.Owner!.RequestServices, state.Provider),
                "Actual server completed callback bypassed the pending scoped async resource.");
            state.Release!.SetResult(true);
            await request;
            observations.Add(new { scenario = "ActualRegisteredResponseGate", actual_callback_waited_for_real_scope = true,
                state.ActualResponseCallback, state.ProviderCleared, state.CompletedCalls, state.AsyncCalls, state.SyncCalls,
                state.Body, state.Status });
        }
        foreach (var kind in new[] { ResourceKind.Sync, ResourceKind.Async })
        {
            using var lifecycle = new RequestServicesLifecycle(new DisposalProfile(kind.ToString(), kind, 1));
            var state = lifecycle.Prepare(new CallState { Fail = true });
            Exception? observed = null;
            try
            {
                state.Owner!.Dispose();
            }
            catch (Exception error)
            {
                observed = error;
            }
            Require(observed is InvalidOperationException { Message: "actual scoped cleanup failed", InnerException: null } &&
                ReferenceEquals(state.Owner!.RequestServices, state.Provider), "Actual completed/immediate failure propagation or clearing changed.");
            state.Owner!.Dispose();
            Require(state.Owner.RequestServices is null, "Repeated failed scope did not clear its retained reference.");
            lifecycle.End(state);
            observations.Add(new { scenario = $"Immediate{kind}Fault", exception_type = observed.GetType().FullName,
                exception_message = observed.Message, retained_after_fault = true, cleared_after_repeated_dispose = true });
        }
        using (var root = new ServiceCollection().AddSingleton<RootMarker>().BuildServiceProvider())
        {
            var missing = new DefaultHttpContext();
            Require(missing.RequestServices is null, "Missing factory unexpectedly created request services.");
            Require(missing.Features.Get<IServiceProvidersFeature>() is RequestServicesFeature, "Actual default feature factory did not run.");
            ((RequestServicesFeature)missing.Features.Get<IServiceProvidersFeature>()!).Dispose();
            observations.Add(new { scenario = "MissingScopeFactory", provider_remains_null = missing.RequestServices is null });
            var assigned = new DefaultHttpContext { ServiceScopeFactory = root.GetRequiredService<IServiceScopeFactory>() };
            assigned.RequestServices = root;
            var owner = (RequestServicesFeature)assigned.Features.Get<IServiceProvidersFeature>()!;
            owner.Dispose();
            Require(owner.RequestServices is null && root.GetRequiredService<RootMarker>() is not null, "Assigned provider was disposed or retained incorrectly.");
            observations.Add(new { scenario = "AssignedProvider", owner_reference_cleared = true, caller_provider_not_disposed = true });
        }
        var resources = new List<object>();
        foreach (var kind in new[] { ResourceKind.Empty, ResourceKind.Sync, ResourceKind.Async, ResourceKind.Source })
        {
            var count = kind is ResourceKind.Empty ? 0 : 1;
            using var lifecycle = new RequestServicesLifecycle(new DisposalProfile(kind.ToString(), kind, count));
            var identity = lifecycle.Prepare();
            var value = identity.Owner!.DisposeAsync();
            Require(value.IsCompletedSuccessfully, "Completed real scope unexpectedly returned pending.");
            var task = value.AsTask();
            Require(ReferenceEquals(task, Task.CompletedTask), "Non-generic completed task does not use cached Task.CompletedTask.");
            task.GetAwaiter().GetResult();
            lifecycle.CaptureAndValidate(identity, publicRequest: false);
            lifecycle.End(identity);
            var warmup = lifecycle.RunPrepared(synchronous: true);
            const int operations = 5000;
            var states = new CallState[operations];
            for (var i = 0; i < states.Length; i++)
            {
                states[i] = lifecycle.Prepare();
                lifecycle.End(states[i]);
            }
            var start = GC.GetAllocatedBytesForCurrentThread();
            for (var i = 0; i < states.Length; i++)
            {
                states[i].Owner!.Dispose();
            }
            var allocated = GC.GetAllocatedBytesForCurrentThread() - start;
            Require(allocated == 0, "Actual original/completed disposal-only path allocated; do not claim no-wrapper without investigating.");
            foreach (var state in states)
            {
                lifecycle.CaptureAndValidate(state, publicRequest: false);
            }
            resources.Add(new { kind = kind.ToString(), operations, allocated_bytes = allocated,
                allocated_bytes_per_disposal = (double)allocated / operations,
                actual_completed_as_task_is_cached_task = true, actual_default_context_di_scopes = true,
                all_references_and_resources_validated = true });
        }
        File.WriteAllText(Path.Combine(artifacts, "functional-probe.json"),
            JsonSerializer.Serialize(observations, new JsonSerializerOptions { WriteIndented = true }));
        File.WriteAllText(Path.Combine(artifacts, "resource-check.json"),
            JsonSerializer.Serialize(resources, new JsonSerializerOptions { WriteIndented = true }));
    }
}
