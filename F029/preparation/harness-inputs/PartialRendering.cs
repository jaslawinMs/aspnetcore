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
using Moq;

namespace AutoPerf;

internal sealed class RenderGate : IDisposable
{
    public ManualResetEventSlim Entered { get; } = new();
    public TaskCompletionSource Completion { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public int ProducerThreadId { get; set; }

    public void Dispose()
    {
        Completion.TrySetResult();
        Entered.Dispose();
    }
}

internal sealed class PartialFixture : IDisposable
{
    private readonly ServiceProvider _services;
    private readonly IHtmlGenerator _generator = new Mock<IHtmlGenerator>(MockBehavior.Strict).Object;
    private readonly IRazorViewEngine _layoutEngine = new Mock<IRazorViewEngine>(MockBehavior.Strict).Object;
    private readonly IRazorPageActivator _activator;
    private readonly DiagnosticListener _diagnostics = new("AutoPerf.F029");

    public PartialFixture()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMvcCore().AddViews();
        _services = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        var activator = new Mock<IRazorPageActivator>(MockBehavior.Strict);
        activator.Setup(value => value.Activate(It.IsAny<IRazorPage>(), It.IsAny<ViewContext>()));
        _activator = activator.Object;
    }

    public PartialRequest CreateRequest(int payloadLength, RenderGate? gate = null)
    {
        return new PartialRequest(_services.CreateScope(), _generator, _layoutEngine, _activator,
            _diagnostics, new string('x', payloadLength), gate);
    }

    public async Task<int> RenderAndConsumeAsync(string profile)
    {
        using var request = CreateRequest(profile.EndsWith("4096", StringComparison.Ordinal) ? 4096 : 32);
        var content = profile.StartsWith("Async.", StringComparison.Ordinal)
            ? await request.CallAsync()
            : request.CallSync();

        return request.Consume(content);
    }

    public void Dispose()
    {
        _diagnostics.Dispose();
        _services.Dispose();
    }
}

internal sealed class PartialRequest : IDisposable
{
    private readonly IServiceScope _scope;
    private readonly HtmlHelper _helper;
    private readonly PreparedViewEngine _viewEngine;
    private readonly StringWriter _consumption = new(CultureInfo.InvariantCulture);

    public PartialRequest(IServiceScope scope, IHtmlGenerator generator, IRazorViewEngine layoutEngine,
        IRazorPageActivator activator, DiagnosticListener diagnostics, string payload, RenderGate? gate)
    {
        _scope = scope;
        Expected = "<p>" + payload + "</p>";
        var metadata = new EmptyModelMetadataProvider();
        var http = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        var bufferScope = scope.ServiceProvider.GetRequiredService<IViewBufferScope>();
        ScopeType = bufferScope.GetType().FullName ?? throw new InvalidOperationException("Actual buffer scope type required.");
        Evidence.Require(ScopeType == "Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope",
            "Resolve the real scoped MVC buffer owner,not a replacement buffer.");
        ParentViewData = new ViewDataDictionary(metadata) { Model = ParentModel };
        ParentViewData["parent-marker"] = ParentModel;
        _viewEngine = new PreparedViewEngine(() =>
        {
            var page = new ProbePage(payload, gate) { Path = "/Views/Shared/_Probe.cshtml" };
            return new TrackedView(new RazorView(layoutEngine, activator, [], page, HtmlEncoder.Default, diagnostics), page);
        });
        var context = new ViewContext(new ActionContext(http, new RouteData(), new ActionDescriptor()),
            new UnusedRootView(), ParentViewData,
            new TempDataDictionary(http, new Mock<ITempDataProvider>(MockBehavior.Strict).Object),
            TextWriter.Null, new HtmlHelperOptions());
        _helper = new HtmlHelper(generator, _viewEngine, metadata, bufferScope, HtmlEncoder.Default, UrlEncoder.Default);
        _helper.Contextualize(context);
    }

    public object ParentModel { get; } = new();
    public object SelectedModel { get; } = new();
    public ViewDataDictionary ParentViewData { get; }
    public string ScopeType { get; }
    public string Expected { get; }
    public TrackedView View => _viewEngine.LastView ?? throw new InvalidOperationException("Actual view lookup did not occur.");
    public string Consumed => _consumption.ToString();

    public IHtmlContent CallSync()
    {
        return _helper.Partial("_Probe", SelectedModel, ParentViewData);
    }

    public Task<IHtmlContent> CallAsync()
    {
        return _helper.PartialAsync("_Probe", SelectedModel, ParentViewData);
    }

    public int Consume(IHtmlContent content)
    {
        content.WriteTo(_consumption, HtmlEncoder.Default);

        return _consumption.GetStringBuilder().Length;
    }

    public object Capture(string label, bool success)
    {
        Evidence.Require(_viewEngine.GetViewCalls == 1 && View.DisposeCalls == 1 && View.RenderCalls == 1,
            "Actual GetView/render/disposal must each complete exactly once.");
        Evidence.Require(ReferenceEquals(View.Page.ObservedModel, SelectedModel) &&
            !ReferenceEquals(View.Page.ObservedViewData, ParentViewData) &&
            ReferenceEquals(ParentViewData.Model, ParentModel) &&
            ReferenceEquals(ParentViewData["parent-marker"], ParentModel), "Real partial model/ViewData cloning changed.");
        Evidence.Require(View.Page.Completed == success && (!success || Consumed == Expected),
            "Actual page completion or consumed HTML differs.");

        return new
        {
            label, success, actualConsumed = Consumed, expected = success ? Expected : "",
            actualPageCompleted = View.Page.Completed, actualViewRenderCalls = View.RenderCalls,
            actualViewDisposeCalls = View.DisposeCalls, actualLookupCalls = _viewEngine.GetViewCalls,
            actualModelAndViewDataContractsMatched = true, actualScopeImplementation = ScopeType,
            actualOwnerType = typeof(HtmlHelper).FullName, actualRendererType = typeof(RazorView).FullName,
            actualProducerType = typeof(ProbePage).FullName,
        };
    }

    public void Dispose()
    {
        _scope.Dispose();
        _consumption.Dispose();
    }

    private sealed class UnusedRootView : IView
    {
        public string Path => "/Views/Root.cshtml";

        public Task RenderAsync(ViewContext context)
        {
            throw new InvalidOperationException("The containing view is not the measured partial producer.");
        }
    }

    private sealed class PreparedViewEngine(Func<TrackedView> factory) : ICompositeViewEngine
    {
        public IReadOnlyList<IViewEngine> ViewEngines => [];
        public TrackedView? LastView { get; private set; }
        public int GetViewCalls { get; private set; }

        public ViewEngineResult GetView(string? executingFilePath, string viewPath, bool isMainPage)
        {
            Evidence.Require(executingFilePath is null && viewPath == "_Probe" && !isMainPage, "Actual partial lookup arguments differ.");
            GetViewCalls++;
            LastView = factory();

            return ViewEngineResult.Found(viewPath, LastView);
        }

        public ViewEngineResult FindView(ActionContext context, string viewName, bool isMainPage)
        {
            throw new InvalidOperationException("Prepared successful GetView must not fall through to FindView.");
        }
    }
}

internal sealed class TrackedView(RazorView owner, ProbePage page) : IView, IDisposable
{
    public string Path => owner.Path;
    public ProbePage Page { get; } = page;
    public int RenderCalls { get; private set; }
    public int DisposeCalls { get; private set; }
    public Task? ActualRenderTask { get; private set; }

    public Task RenderAsync(ViewContext context)
    {
        RenderCalls++;
        ActualRenderTask = owner.RenderAsync(context);

        return ActualRenderTask;
    }

    public void Dispose()
    {
        DisposeCalls++;
    }
}

internal sealed class ProbePage(string payload, RenderGate? gate) : RazorPage
{
    public bool Completed { get; private set; }
    public object? ObservedModel { get; private set; }
    public ViewDataDictionary? ObservedViewData { get; private set; }

    public override async Task ExecuteAsync()
    {
        ObservedModel = ViewContext.ViewData.Model;
        ObservedViewData = ViewContext.ViewData;
        WriteLiteral("<p>");
        if (gate is not null)
        {
            gate.ProducerThreadId = Environment.CurrentManagedThreadId;
            gate.Entered.Set();
            await gate.Completion.Task;
        }
        WriteLiteral(payload);
        WriteLiteral("</p>");
        Completed = true;
    }
}
