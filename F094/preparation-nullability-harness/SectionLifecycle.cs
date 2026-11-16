using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

internal sealed record SectionSpec(string Name, int Count, int NameLength = 16, bool MissingOptional = false, bool Pending = false)
{
    public static readonly SectionSpec[] All =
    [
        new("NoSections", 0), new("Completed1", 1), new("Completed2", 2),
        new("Completed8", 8), new("Completed32", 32), new("Completed128", 128),
        new("Completed8Long", 8, 256), new("MissingOptional", 0, MissingOptional: true),
        new("GatedPending1", 1, Pending: true)
    ];
}

internal sealed record SectionSnapshot(string Profile, string Boundary, bool AsyncCaller,
    string Written, int Invocations, int Tokens, int NullTokens, bool EmptyTokenIdentity,
    bool OriginalDictionaryTransferred, bool ContentMarkedForLayout, string DictionaryType,
    string? BufferScopeType, bool? SyncCallerObservedWaiting, bool? AsyncReturnedPending,
    string? BeforeGateReleaseOutput, string? ErrorType = null, string? ErrorMessage = null,
    bool? ErrorHasNoInner = null, bool? DuplicateAfterFailureRejected = null);

internal sealed class SectionLifecycle : IDisposable
{
    private readonly SectionSpec _spec;
    private readonly string[] _names;
    private readonly string[] _values;
    private readonly ServiceProvider _provider;
    private readonly DiagnosticListener _diagnostics = new("AutoPerf.F094");
    private readonly SectionCoordinator? _coordinator;
    private readonly string _bufferType;
    private readonly bool _failSection;
    public SectionSnapshot Last { get; private set; } = null!;

    public SectionLifecycle(SectionSpec spec, bool failSection = false)
    {
        _spec = spec;
        _failSection = failSection;
        _names = Enumerable.Range(0, spec.Count).Select(index =>
            "Section_" + new string('a', spec.NameLength) + index.ToString("D3", CultureInfo.InvariantCulture)).ToArray();
        _values = _names.Select(name => "<s>" + name + "</s>").ToArray();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMvcCore().AddViews().AddRazorViewEngine();
        _provider = services.BuildServiceProvider();
        using var scope = _provider.CreateScope();
        _bufferType = scope.ServiceProvider.GetRequiredService<IViewBufferScope>().GetType().FullName!;
        if (_bufferType != "Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope")
        {
            throw new InvalidOperationException("Actual scoped pooled Razor view buffering is missing.");
        }
        if (spec.Pending)
        {
            _coordinator = new SectionCoordinator();
        }
    }

    public int RunSync(bool fullView)
    {
        using var operation = CreateOperation(fullView, asyncCaller: false);
        try
        {
            var render = fullView ? operation.View.RenderAsync(operation.Context) : PreparePage(operation);
            render.GetAwaiter().GetResult();
        }
        catch (SectionFailure exception) when (_failSection)
        {
            return CompleteFault(operation, exception);
        }
        return Complete(operation);
    }

    public async Task<int> RunAsync(bool fullView)
    {
        using var operation = CreateOperation(fullView, asyncCaller: true);
        try
        {
            var render = fullView ? operation.View.RenderAsync(operation.Context) : PreparePage(operation);
            if (operation.Gate is { } gate)
            {
                if (!gate.Entered.IsSet || render.IsCompleted)
                {
                    throw new InvalidOperationException("Real asynchronous section/view caller did not return pending.");
                }
                gate.AsyncReturnedPending = true;
                gate.AsyncCallerReturned.Set();
            }
            await render;
        }
        catch (SectionFailure exception) when (_failSection)
        {
            return CompleteFault(operation, exception);
        }
        return Complete(operation);
    }

    private Operation CreateOperation(bool fullView, bool asyncCaller)
    {
        var scope = _provider.CreateScope();
        var writer = new StringWriter(CultureInfo.InvariantCulture);
        SectionGate? gate = _coordinator is null ? null :
            new SectionGate(Thread.CurrentThread, asyncCaller, writer, _coordinator);
        var content = new SectionContent(_spec, _names, _values, fullView, gate, _failSection)
        {
            Path = "/Views/SectionContent.cshtml",
            HtmlEncoder = HtmlEncoder.Default
        };
        var layout = new SectionLayout(_spec, _names, fullView, asyncCaller);
        var view = new RazorView(new SectionLocator(layout), new SectionActivator(), [],
            content, HtmlEncoder.Default, _diagnostics);
        var http = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        var context = new ViewContext(new ActionContext(http, new RouteData(), new ActionDescriptor()),
            view, new ViewDataDictionary(new EmptyModelMetadataProvider(), new ModelStateDictionary()),
            new TempDataDictionary(http, new SectionTempData()), writer, new HtmlHelperOptions());
        return new Operation(scope, writer, gate, content, layout, view, context, fullView, asyncCaller);
    }

    private static Task PreparePage(Operation operation)
    {
        operation.Content.ViewContext = operation.Context;
        operation.Layout.ViewContext = operation.Context;
        operation.Context.ExecutingFilePath = operation.Layout.Path;
        operation.Content.ExecuteAsync().GetAwaiter().GetResult();
        operation.Layout.PreviousSectionWriters = operation.Content.SectionWriters;
        return operation.Layout.ExecuteAsync();
    }

    private int Complete(Operation operation)
    {
        var content = operation.Content;
        var layout = operation.Layout;
        var expected = (operation.FullView ? "<body/>" : string.Empty) + string.Concat(_values);
        var written = operation.Writer.ToString();
        if (content.Invocations != _spec.Count || layout.Tokens != _spec.Count ||
            layout.NullTokens != (_spec.MissingOptional ? 1 : 0) || !layout.EmptyTokens ||
            written != expected || !ReferenceEquals(layout.PreviousSectionWriters, content.SectionWriters) ||
            operation.FullView != content.IsLayoutBeingRendered)
        {
            throw new InvalidOperationException("Actual section producer/token/transfer/HTML contract differs.");
        }
        if (!operation.FullView)
        {
            layout.EnsureRenderedBodyOrSections();
        }
        if (operation.Gate is { } gate &&
            (!gate.Entered.IsSet || !gate.Release.Task.IsCompletedSuccessfully || gate.BeforeOutput != string.Empty ||
            (operation.AsyncCaller ? !gate.AsyncReturnedPending : !gate.SyncCallerObservedWaiting)))
        {
            throw new InvalidOperationException("Actual incomplete producer/caller/output gate was not established.");
        }
        Last = new SectionSnapshot(_spec.Name,
            operation.FullView ? "Actual RazorView section transfer/scoped pooled buffering/HTML flush" :
                "Real public page/DefineSection; caller-set PreviousSectionWriters diagnostic; RazorView transfer bypassed",
            operation.AsyncCaller, written, content.Invocations, layout.Tokens, layout.NullTokens, layout.EmptyTokens,
            ReferenceEquals(layout.PreviousSectionWriters, content.SectionWriters), content.IsLayoutBeingRendered,
            layout.PreviousSectionWriters.GetType().FullName!, operation.FullView ? _bufferType : null,
            operation.Gate?.SyncCallerObservedWaiting, operation.Gate?.AsyncReturnedPending, operation.Gate?.BeforeOutput);
        return content.Invocations + layout.NullTokens;
    }

    private int CompleteFault(Operation operation, SectionFailure exception)
    {
        if (_spec.Count != 1 || exception.Message != "actual section failed" || exception.InnerException is not null ||
            operation.Content.Invocations != 1 || operation.Layout.Tokens != 0 || operation.Writer.ToString() != string.Empty)
        {
            throw new InvalidOperationException("Actual failing section/token/output contract differs.");
        }
        var expected = $"RenderSectionAsync invocation in '{operation.Layout.Path}' is invalid. The section '{_names[0]}' has already been rendered.";
        var duplicateRejected = false;
        try
        {
            operation.Layout.RenderSection(_names[0]);
        }
        catch (InvalidOperationException duplicate) when (duplicate.Message == expected && duplicate.InnerException is null)
        {
            duplicateRejected = true;
        }
        if (!duplicateRejected || !ReferenceEquals(operation.Layout.PreviousSectionWriters, operation.Content.SectionWriters) ||
            (operation.Gate is { } gate && (!gate.Release.Task.IsCompletedSuccessfully || gate.BeforeOutput != string.Empty ||
                (operation.AsyncCaller ? !gate.AsyncReturnedPending : !gate.SyncCallerObservedWaiting))))
        {
            throw new InvalidOperationException("Actual faulted scope state/pending producer/duplicate behavior differs.");
        }
        Last = new SectionSnapshot(_spec.Name,
            operation.FullView ? "Actual RazorView section transfer/scoped pooled buffering/failing producer" :
                "Public page failing section diagnostic",
            operation.AsyncCaller, operation.Writer.ToString(), 1, 0, 0, operation.Layout.EmptyTokens,
            true, operation.Content.IsLayoutBeingRendered, operation.Layout.PreviousSectionWriters.GetType().FullName!,
            operation.FullView ? _bufferType : null, operation.Gate?.SyncCallerObservedWaiting,
            operation.Gate?.AsyncReturnedPending, operation.Gate?.BeforeOutput,
            exception.GetType().FullName, exception.Message, true, duplicateRejected);
        return 0;
    }

    public void Dispose()
    {
        _coordinator?.Dispose();
        _diagnostics.Dispose();
        _provider.Dispose();
    }

    private sealed record Operation(IServiceScope Scope, StringWriter Writer, SectionGate? Gate,
        SectionContent Content, SectionLayout Layout, RazorView View, ViewContext Context,
        bool FullView, bool AsyncCaller) : IDisposable
    {
        public void Dispose()
        {
            Gate?.Dispose();
            Writer.Dispose();
            Scope.Dispose();
        }
    }
}

internal sealed class SectionContent(SectionSpec spec, string[] names, string[] values, bool fullView, SectionGate? gate, bool failSection) : RazorPage
{
    public int Invocations { get; private set; }

    public override Task ExecuteAsync()
    {
        if (fullView)
        {
            Layout = "/Views/Shared/_SectionLayout.cshtml";
            WriteLiteral("<body/>");
        }
        for (var index = 0; index < spec.Count; index++)
        {
            var item = index;
            DefineSection(names[item], () => RenderValue(item));
        }
        return Task.CompletedTask;
    }

    private Task RenderValue(int index)
    {
        Invocations++;
        if (gate is not null)
        {
            return RenderGated(index, gate);
        }
        if (failSection)
        {
            throw new SectionFailure();
        }
        WriteLiteral(values[index]);
        return Task.CompletedTask;
    }

    private async Task RenderGated(int index, SectionGate pending)
    {
        pending.Enter();
        await pending.Release.Task;
        if (failSection)
        {
            throw new SectionFailure();
        }
        WriteLiteral(values[index]);
    }
}

internal sealed class SectionFailure() : Exception("actual section failed")
{
}

internal sealed class SectionLayout : RazorPage
{
    private readonly SectionSpec _spec;
    private readonly string[] _names;
    private readonly bool _fullView;
    private readonly bool _asyncCaller;
    public int Tokens { get; private set; }
    public int NullTokens { get; private set; }
    public bool EmptyTokens { get; private set; } = true;

    public SectionLayout(SectionSpec spec, string[] names, bool fullView, bool asyncCaller)
    {
        _spec = spec;
        _names = names;
        _fullView = fullView;
        _asyncCaller = asyncCaller;
        Path = "/Views/Shared/_SectionLayout.cshtml";
        HtmlEncoder = System.Text.Encodings.Web.HtmlEncoder.Default;
    }

    public override Task ExecuteAsync() => _asyncCaller ? RenderAsync() : RenderSync();

    private Task RenderSync()
    {
        if (_fullView)
        {
            Write(RenderBody());
        }
        foreach (var name in _names)
        {
            Consume(RenderSection(name), missing: false);
        }
        if (_spec.MissingOptional)
        {
            Consume(RenderSection("Missing", required: false), missing: true);
        }
        return Task.CompletedTask;
    }

    private async Task RenderAsync()
    {
        if (_fullView)
        {
            Write(RenderBody());
        }
        foreach (var name in _names)
        {
            Consume(await RenderSectionAsync(name), missing: false);
        }
        if (_spec.MissingOptional)
        {
            Consume(await RenderSectionAsync("Missing", required: false), missing: true);
        }
    }

    private void Consume(HtmlString? token, bool missing)
    {
        if (missing)
        {
            if (token is not null)
            {
                throw new InvalidOperationException("Absent optional section token must be null.");
            }
            NullTokens++;
        }
        else
        {
            EmptyTokens &= ReferenceEquals(token, HtmlString.Empty);
            Tokens++;
        }
        Write(token);
    }
}

internal sealed class SectionGate(Thread caller, bool asyncCaller, StringWriter writer, SectionCoordinator coordinator) : IDisposable
{
    public Thread Caller { get; } = caller;
    public bool AsyncCaller { get; } = asyncCaller;
    public ManualResetEventSlim Entered { get; } = new();
    public ManualResetEventSlim AsyncCallerReturned { get; } = new();
    public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public bool SyncCallerObservedWaiting { get; set; }
    public bool AsyncReturnedPending { get; set; }
    public string? BeforeOutput { get; set; }

    public void Enter()
    {
        Entered.Set();
        coordinator.Queue(this);
    }

    public string CaptureOutput() => writer.ToString();

    public void Dispose()
    {
        Entered.Dispose();
        AsyncCallerReturned.Dispose();
    }
}

internal sealed class SectionCoordinator : IDisposable
{
    private readonly BlockingCollection<SectionGate> _requests = new();
    private readonly Thread _worker;

    public SectionCoordinator()
    {
        _worker = new Thread(ReleaseAfterObservedBoundary) { IsBackground = true, Name = "F094 actual section producer gate" };
        _worker.Start();
    }

    public void Queue(SectionGate gate) => _requests.Add(gate);

    private void ReleaseAfterObservedBoundary()
    {
        foreach (var gate in _requests.GetConsumingEnumerable())
        {
            var reached = SpinWait.SpinUntil(() => gate.AsyncCaller
                ? gate.AsyncCallerReturned.IsSet
                : (gate.Caller.ThreadState & System.Threading.ThreadState.WaitSleepJoin) != 0, TimeSpan.FromSeconds(10));
            if (!reached)
            {
                gate.Release.SetException(new InvalidOperationException("Real pending section caller boundary was not observed."));
                continue;
            }
            gate.SyncCallerObservedWaiting = !gate.AsyncCaller;
            gate.BeforeOutput = gate.CaptureOutput();
            gate.Release.SetResult();
        }
    }

    public void Dispose()
    {
        _requests.CompleteAdding();
        if (!_worker.Join(TimeSpan.FromSeconds(10)))
        {
            throw new InvalidOperationException("Owned section coordinator failed to stop.");
        }
        _requests.Dispose();
    }
}

internal sealed class SectionActivator : IRazorPageActivator
{
    public void Activate(IRazorPage page, ViewContext context) { }
}

internal sealed class SectionLocator(IRazorPage layout) : IRazorViewEngine
{
    public RazorPageResult GetPage(string executingFilePath, string pagePath) => new(pagePath, layout);
    public RazorPageResult FindPage(ActionContext context, string pageName) => throw new InvalidOperationException("Unexpected layout fallback.");
    public ViewEngineResult FindView(ActionContext context, string viewName, bool isMainPage) => throw new InvalidOperationException("Unexpected view lookup.");
    public ViewEngineResult GetView(string executingFilePath, string viewPath, bool isMainPage) => throw new InvalidOperationException("Unexpected view lookup.");
    public string GetAbsolutePath(string executingFilePath, string pagePath) => pagePath;
}

internal sealed class SectionTempData : ITempDataProvider
{
    public IDictionary<string, object> LoadTempData(HttpContext context) => new Dictionary<string, object>();
    public void SaveTempData(HttpContext context, IDictionary<string, object> values) { }
}
