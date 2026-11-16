using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AutoPerf;

#pragma warning disable CS0618 // Validate the retained obsolete interface.
internal static class LoaderProbe
{
    public static object VerifyFunctional()
    {
        var failures = new List<object>();
        using var lifecycle = new LoaderLifecycle("CachedOriginal");
        if (!ReferenceEquals(lifecycle.Legacy.Load(lifecycle.CachedInput), lifecycle.CachedResult))
        {
            throw new InvalidOperationException("Actual obsolete DI bridge result identity differs.");
        }
        var nullError = Throws<ArgumentNullException>(() => lifecycle.Legacy.Load(null!));
        if (nullError.ParamName != "actionDescriptor")
        {
            throw new InvalidOperationException("Actual default-loader entry validation differs.");
        }
        var marker1 = new ProbeMetadata("first");
        var marker2 = new ProbeMetadata("second");
        var metadataInput = LoaderLifecycle.Input();
        var metadataTask = lifecycle.Modern.LoadAsync(metadataInput, new EndpointMetadataCollection(marker1, marker2));
        var metadataResult = metadataTask.GetAwaiter().GetResult();
        var actualMetadata = metadataResult.Endpoint!.Metadata.GetOrderedMetadata<ProbeMetadata>();
        var ignoredMarker = new ProbeMetadata("cached request is ignored");
        if (actualMetadata.Count != 2 || !ReferenceEquals(actualMetadata[0], marker1) ||
            !ReferenceEquals(actualMetadata[1], marker2) ||
            !ReferenceEquals(lifecycle.Legacy.Load(metadataInput), metadataResult) ||
            !ReferenceEquals(lifecycle.Modern.LoadAsync(metadataInput, new EndpointMetadataCollection(ignoredMarker)), metadataTask) ||
            metadataResult.Endpoint.Metadata.Contains(ignoredMarker))
        {
            throw new InvalidOperationException("Actual endpoint metadata order/cache identity differs.");
        }
        foreach (var cancel in new[] { false, true })
        {
            foreach (var asyncCaller in new[] { false, true })
            {
                using var coordinator = new LoaderCoordinator();
                using var gate = new LoaderGate(Thread.CurrentThread, asyncCaller, coordinator)
                {
                    Fail = !cancel,
                    Cancel = cancel
                };
                var input = LoaderLifecycle.Input();
                lifecycle.Extension.Arm(gate);
                Exception error;
                if (asyncCaller)
                {
                    var task = lifecycle.Modern.LoadAsync(input, EndpointMetadataCollection.Empty);
                    if (!gate.Entered.IsSet || task.IsCompleted)
                    {
                        throw new InvalidOperationException("Actual failing compiler task never returned pending.");
                    }
                    gate.AsyncReturnedPending = true;
                    gate.AsyncCallerReturned.Set();
                    error = cancel ? Throws<TaskCanceledException>(() => task.GetAwaiter().GetResult()) :
                        Throws<CompilerFailure>(() => task.GetAwaiter().GetResult());
                }
                else
                {
                    error = cancel ? Throws<TaskCanceledException>(() => lifecycle.Legacy.Load(input)) :
                        Throws<CompilerFailure>(() => lifecycle.Legacy.Load(input));
                }
                var cached = lifecycle.Modern.LoadAsync(input, EndpointMetadataCollection.Empty);
                Exception repeated = cancel ? Throws<TaskCanceledException>(() => lifecycle.Legacy.Load(input)) :
                    Throws<CompilerFailure>(() => lifecycle.Legacy.Load(input));
                if (!ReferenceEquals(cached, lifecycle.Modern.LoadAsync(input, EndpointMetadataCollection.Empty)) ||
                    error.InnerException is not null || (cancel ? !cached.IsCanceled : !cached.IsFaulted) ||
                    (!cancel && error.Message != "actual compiler extension failed") ||
                    repeated.GetType() != error.GetType() || repeated.Message != error.Message ||
                    repeated.InnerException is not null ||
                    (asyncCaller ? !gate.AsyncReturnedPending : !gate.SyncObservedWaiting) ||
                    !gate.NoResultBeforeRelease)
                {
                    throw new InvalidOperationException("Actual cached compiler failure/cancel/caller contract differs.");
                }
                failures.Add(new
                {
                    cancel, asyncCaller, actualProducerEntered = gate.Entered.IsSet,
                    gate.SyncObservedWaiting, gate.AsyncReturnedPending, gate.NoResultBeforeRelease,
                    exceptionType = error.GetType().FullName, message = error.Message,
                    cachedTaskFaulted = cached.IsFaulted, cachedTaskCanceled = cached.IsCanceled,
                    actualTaskIdentityPreserved = true, unwrapped = true,
                    alreadyFaultedOrCanceledObsoleteBridge = true
                });
            }
        }
        return new { sameActualDiBridge = true, sameActualCachedResult = true,
            synchronousNullParameter = nullError.ParamName,
            actualEndpointMetadataOrder = new[] { marker1.Name, marker2.Name },
            sameActualEndpointAndMetadataCache = true, newCachedMetadataIgnored = true,
            pendingCompilerFailuresAndCancellation = failures };
    }

    public static object[] MeasureResources()
    {
        const int operations = 5000;
        var rows = new List<object>();
        foreach (var profile in new[] { "CachedOriginal", "CompiledSelf" })
        {
            using var lifecycle = new LoaderLifecycle(profile);
            PageActionDescriptor input = profile == "CompiledSelf" ? lifecycle.CachedResult : lifecycle.CachedInput;
            foreach (var legacy in new[] { true, false })
            {
                var first = legacy ? lifecycle.Legacy.Load(input) :
                    lifecycle.Modern.LoadAsync(input, EndpointMetadataCollection.Empty).GetAwaiter().GetResult();
                if (!ReferenceEquals(first, lifecycle.CachedResult))
                {
                    throw new InvalidOperationException("Actual loader priming failed.");
                }
                var before = GC.GetAllocatedBytesForCurrentThread();
                for (var index = 0; index < operations; index++)
                {
                    var result = legacy ? lifecycle.Legacy.Load(input) :
                        lifecycle.Modern.LoadAsync(input, EndpointMetadataCollection.Empty).GetAwaiter().GetResult();
                    if (!ReferenceEquals(result, lifecycle.CachedResult))
                    {
                        throw new InvalidOperationException("Actual resource probe result identity differs.");
                    }
                }
                var allocated = GC.GetAllocatedBytesForCurrentThread() - before;
                rows.Add(new { profile, caller = legacy ? "LegacyBridge" : "ModernWait", operations,
                    allocatedBytes = allocated, bytesPerOperation = (double)allocated / operations,
                    actualCachedResultIdentity = true, noInternalCacheInjection = true,
                    boundary = "Real DefaultPageLoader/DI/default compiled catalog; primed public calls only, not cold endpoint creation." });
            }
        }
        return rows.ToArray();
    }

    private static TException Throws<TException>(Action action) where TException : Exception
    {
        try
        {
            action();
        }
        catch (TException exception)
        {
            return exception;
        }
        throw new InvalidOperationException($"Expected actual {typeof(TException).Name} was not observed.");
    }

    private sealed record ProbeMetadata(string Name);
}
#pragma warning restore CS0618
