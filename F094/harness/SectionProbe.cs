using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Razor;

namespace AutoPerf;

internal sealed record ResourceRow(string Method, bool Present, int Operations, long AllocatedBytes,
    double BytesPerOperation, bool ActualEmptyOrNullToken, string Boundary);

internal static class SectionProbe
{
    public static object VerifyFunctional()
    {
        var faults = new List<object>();
        foreach (var pending in new[] { false, true })
        {
            foreach (var asyncCaller in new[] { false, true })
            {
                using var lifecycle = new SectionLifecycle(new SectionSpec(pending ? "PendingFault" : "ImmediateFault", 1, Pending: pending),
                    failSection: true);
                if (asyncCaller)
                {
                    lifecycle.RunAsync(fullView: true).GetAwaiter().GetResult();
                }
                else
                {
                    lifecycle.RunSync(fullView: true);
                }
                faults.Add(lifecycle.Last);
            }
        }
        var page = new ProbePage();
        var syncNull = Throws<ArgumentNullException>(() => page.RenderSection(null!));
        var asyncNull = Throws<ArgumentNullException>(() => page.RenderSectionAsync(null!));
        if (syncNull.ParamName != "name" || asyncNull.ParamName != "name")
        {
            throw new InvalidOperationException("Null name validation differs.");
        }
        var syncNoLayout = Throws<InvalidOperationException>(() => page.RenderSection("Main"));
        var asyncNoLayout = Throws<InvalidOperationException>(() => page.RenderSectionAsync("Main"));
        var expectedSync = "RenderSection invocation in '/Views/Probe.cshtml' is invalid. RenderSection can only be called from a layout page.";
        var expectedAsync = expectedSync.Replace("RenderSection", "RenderSectionAsync", StringComparison.Ordinal);
        if (syncNoLayout.Message != expectedSync || asyncNoLayout.Message != expectedAsync)
        {
            throw new InvalidOperationException("Synchronous entry-point layout validation differs.");
        }
        var first = CreatePresent();
        var second = CreatePresent();
        var firstTask = first.RenderSectionAsync("Measured");
        var secondTask = second.RenderSectionAsync("Measured");
        if (ReferenceEquals(firstTask, secondTask) || !ReferenceEquals(firstTask.GetAwaiter().GetResult(), HtmlString.Empty) ||
            !ReferenceEquals(secondTask.GetAwaiter().GetResult(), HtmlString.Empty))
        {
            throw new InvalidOperationException("Public completed-present task/token identity differs.");
        }
        var firstMissing = CreateMissing().RenderSectionAsync("Absent", required: false);
        var secondMissing = CreateMissing().RenderSectionAsync("Absent", required: false);
        if (!ReferenceEquals(firstMissing, secondMissing) || firstMissing.GetAwaiter().GetResult() is not null)
        {
            throw new InvalidOperationException("Cached public null task/token identity differs.");
        }
        var mixed = CreatePresent();
        mixed.RenderSection("Measured");
        var duplicate = Throws<InvalidOperationException>(() => mixed.RenderSectionAsync("Measured").GetAwaiter().GetResult());
        if (duplicate.Message != "RenderSectionAsync invocation in '/Views/Probe.cshtml' is invalid. The section 'Measured' has already been rendered.")
        {
            throw new InvalidOperationException("Mixed sync/async rendered-state ordering differs.");
        }
        var completedFault = new ProbePage();
        var content = new ProbePage();
        content.DefineSection("Fault", () => Task.FromException(new SectionFailure()));
        completedFault.PreviousSectionWriters = content.SectionWriters;
        var failure = Throws<SectionFailure>(() => completedFault.RenderSection("Fault"));
        if (failure.Message != "actual section failed" || failure.InnerException is not null)
        {
            throw new InvalidOperationException("Completed fault task is not unwrapped.");
        }
        return new
        {
            realViewFaults = faults, synchronousNullNameValidated = true, synchronousLayoutEntryValidated = true,
            publicPresentTasksRemainDistinct = true, actualEmptyTokenIdentity = true, cachedNullTaskRetained = true,
            mixedSyncAsyncDuplicateRejected = true, completedFaultUnwrapped = true,
            existingRequiredMissingAndOutputTests = "14 actual original/selected owning tests, audited separately"
        };
    }

    public static ResourceRow[] MeasureResources()
    {
        const int operations = 5000;
        var rows = new List<ResourceRow>();
        foreach (var asyncCaller in new[] { false, true })
        {
            foreach (var present in new[] { true, false })
            {
                var warm = present ? CreatePresent() : CreateMissing();
                Consume(warm, asyncCaller, present);
                var pages = Enumerable.Range(0, operations).Select(_ => present ? CreatePresent() : CreateMissing()).ToArray();
                var before = GC.GetAllocatedBytesForCurrentThread();
                foreach (var owner in pages)
                {
                    Consume(owner, asyncCaller, present);
                }
                var allocated = GC.GetAllocatedBytesForCurrentThread() - before;
                rows.Add(new ResourceRow(asyncCaller ? "RenderSectionAsync" : "RenderSection", present,
                    operations, allocated, (double)allocated / operations, true,
                    "Precreated/primed actual public page + real DefineSection callback; only public render call/identity check counted; caller-set writers, not RazorView transfer."));
            }
        }
        return rows.ToArray();
    }

    private static void Consume(ProbePage page, bool asyncCaller, bool present)
    {
        var token = asyncCaller ? page.RenderSectionAsync(present ? "Measured" : "Absent", required: present).GetAwaiter().GetResult()
            : page.RenderSection(present ? "Measured" : "Absent", required: present);
        if (present ? !ReferenceEquals(token, HtmlString.Empty) : token is not null)
        {
            throw new InvalidOperationException("Actual allocation probe producer/token was not reached.");
        }
    }

    private static ProbePage CreatePresent()
    {
        var content = new ProbePage();
        content.DefineSection("Warm", static () => Task.CompletedTask);
        content.DefineSection("Measured", static () => Task.CompletedTask);
        var layout = new ProbePage { PreviousSectionWriters = content.SectionWriters };
        if (!ReferenceEquals(layout.RenderSection("Warm"), HtmlString.Empty))
        {
            throw new InvalidOperationException("Actual completed-scope priming failed.");
        }
        return layout;
    }

    private static ProbePage CreateMissing() => new() { PreviousSectionWriters = new ProbePage().SectionWriters };

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

    private sealed class ProbePage : RazorPage
    {
        public ProbePage()
        {
            Path = "/Views/Probe.cshtml";
        }
        public override Task ExecuteAsync() => Task.CompletedTask;
    }
}
