// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Diagnostics;
using System.Globalization;
using System.Text.Encodings.Web;
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

internal sealed class RenderPartialFixture : IDisposable
{
    private readonly ServiceProvider _services;
    private readonly IHtmlGenerator _generator = new Mock<IHtmlGenerator>(MockBehavior.Strict).Object;
    private readonly IRazorViewEngine _layoutEngine = new Mock<IRazorViewEngine>(MockBehavior.Strict).Object;
    private readonly IRazorPageActivator _activator;
    private readonly DiagnosticListener _diagnostics = new("AutoPerf.F030");

    public RenderPartialFixture()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMvcCore().AddViews();
        _services = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        var activator = new Mock<IRazorPageActivator>(MockBehavior.Strict);
        activator.Setup(value => value.Activate(It.IsAny<IRazorPage>(), It.IsAny<ViewContext>()));
        _activator = activator.Object;
    }

    public RenderPartialRequest CreateRequest(int payloadLength, bool asynchronous, RenderGate? gate = null)
    {
        return new RenderPartialRequest(_services.CreateScope(), _generator, _layoutEngine, _activator,
            _diagnostics, new string('x', payloadLength), asynchronous, gate);
    }

    public async Task<int> RenderAndConsumeAsync(string profile)
    {
        var asynchronous = profile.StartsWith("Async.", StringComparison.Ordinal);
        using var request = CreateRequest(profile.EndsWith("4096", StringComparison.Ordinal) ? 4096 : 32, asynchronous);
        if (asynchronous)
        {
            await request.CallAsync().ConfigureAwait(false);
        }
        else
        {
            request.CallSync();
        }

        return request.ConsumedLength;
    }

    public void Dispose()
    {
        _diagnostics.Dispose();
        _services.Dispose();
    }
}

internal sealed class RenderPartialRequest : IDisposable
{
    private readonly IServiceScope _scope;
    private readonly RazorView _parentView;
    private readonly ViewContext _parentContext;
    private readonly PreparedViewEngine _viewEngine;
    private readonly ObservedWriter _output = new();
    private Task? _actualOuterRenderTask;

    public RenderPartialRequest(IServiceScope scope, IHtmlGenerator generator, IRazorViewEngine layoutEngine,
        IRazorPageActivator activator, DiagnosticListener diagnostics, string payload, bool asynchronous, RenderGate? gate)
    {
        _scope = scope;
        Expected = "before|<p>" + payload + "</p>|after";
        var metadata = new EmptyModelMetadataProvider();
        var http = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        var bufferScope = scope.ServiceProvider.GetRequiredService<IViewBufferScope>();
        ScopeType = bufferScope.GetType().FullName ?? throw new InvalidOperationException("Actual scoped buffer type required.");
        Evidence.Require(ScopeType == "Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope",
            "Resolve the real scoped MVC buffer owner,not a replacement.");
        ParentViewData = new ViewDataDictionary(metadata, new ModelStateDictionary()) { Model = ParentModel };
        ParentViewData["parent-marker"] = ParentModel;
        _viewEngine = new PreparedViewEngine(() =>
        {
            var page = new ProbePage(payload, gate) { Path = "/Views/Shared/_Probe.cshtml" };
            return new TrackedView(new RazorView(layoutEngine, activator, [], page, HtmlEncoder.Default, diagnostics), page);
        });
        var helper = new HtmlHelper(generator, _viewEngine, metadata, bufferScope, HtmlEncoder.Default, UrlEncoder.Default);
        ParentPage = new ParentPage(helper, SelectedModel, ParentViewData, asynchronous) { Path = "/Views/Parent.cshtml" };
        _parentView = new RazorView(layoutEngine, activator, [], ParentPage, HtmlEncoder.Default, diagnostics);
        _parentContext = new ViewContext(new ActionContext(http, new RouteData(), new ActionDescriptor()),
            _parentView, ParentViewData,
            new TempDataDictionary(http, new Mock<ITempDataProvider>(MockBehavior.Strict).Object),
            _output, new HtmlHelperOptions());
        helper.Contextualize(_parentContext);
    }

    public object ParentModel { get; } = new();
    public object SelectedModel { get; } = new();
    public ViewDataDictionary ParentViewData { get; }
    public ParentPage ParentPage { get; }
    public string ScopeType { get; }
    public string Expected { get; }
    public TrackedView View => _viewEngine.LastView ?? throw new InvalidOperationException("Actual partial lookup did not occur.");
    public Task? ActualOuterRenderTask => Volatile.Read(ref _actualOuterRenderTask);
    public string Consumed => _output.ToString();
    public int ConsumedLength => _output.GetStringBuilder().Length;
    public bool RootWriterDisposed => _output.WasDisposed;

    public void CallSync()
    {
        Evidence.Require(!ParentPage.Asynchronous, "Use the actual synchronous parent-page branch.");
        var task = _parentView.RenderAsync(_parentContext);
        Volatile.Write(ref _actualOuterRenderTask, task);
        Evidence.Require(task.IsCompleted, "The controlled completed StringWriter boundary must not add a harness wait.");
        task.GetAwaiter().GetResult();
    }

    public Task CallAsync()
    {
        Evidence.Require(ParentPage.Asynchronous, "Use the existing async API in the real parent page.");
        var task = _parentView.RenderAsync(_parentContext);
        Volatile.Write(ref _actualOuterRenderTask, task);

        return task;
    }

    public object Capture(string label, bool success)
    {
        Evidence.Require(_viewEngine.GetViewCalls == 1 && View.RenderCalls == 1 && View.DisposeCalls == 1,
            "Actual partial GetView/render/disposal must each complete exactly once.");
        Evidence.Require(ReferenceEquals(View.Page.ObservedModel, SelectedModel) &&
            !ReferenceEquals(View.Page.ObservedViewData, ParentViewData) &&
            ReferenceEquals(ParentViewData.Model, ParentModel) &&
            ReferenceEquals(ParentViewData["parent-marker"], ParentModel),
            "Real partial model or cloned child ViewData differs.");
        Evidence.Require(ParentPage.BeforeWritten && ParentPage.PublicCallFinished &&
            ParentPage.PublicCallSucceeded == success && ParentPage.AfterWritten == success &&
            View.Page.Completed == success && (!success || Consumed == Expected),
            "Ordered parent/public/partial completion or caller-visible writer output differs.");
        Evidence.Require(!RootWriterDisposed && ReferenceEquals(_parentContext.Writer, _output),
            "Actual rendering must restore and leave the caller-owned root writer open.");

        return new
        {
            label,
            success,
            actualRootWriterText = Consumed,
            expectedOnSuccess = Expected,
            actualParentBeforeWritten = ParentPage.BeforeWritten,
            actualParentAfterWritten = ParentPage.AfterWritten,
            actualPublicCallFinished = ParentPage.PublicCallFinished,
            actualPublicCallSucceeded = ParentPage.PublicCallSucceeded,
            actualPublicBoundaryExceptionType = ParentPage.PublicBoundaryFailure?.GetType().FullName,
            actualParentWriterType = ParentPage.ObservedWriterType,
            actualPartialProducerWriterType = View.Page.ObservedWriterType,
            actualPartialPageCompleted = View.Page.Completed,
            actualViewRenderCalls = View.RenderCalls,
            actualViewDisposeCalls = View.DisposeCalls,
            actualLookupCalls = _viewEngine.GetViewCalls,
            actualModelAndViewDataContractsMatched = true,
            actualRootWriterDisposed = RootWriterDisposed,
            actualCallerWriterRestored = true,
            actualScopeImplementation = ScopeType,
            actualOwnerType = typeof(HtmlHelper).FullName,
            actualParentAndPartialRendererType = typeof(RazorView).FullName,
            actualProducerType = typeof(ProbePage).FullName,
        };
    }

    public void Dispose()
    {
        _scope.Dispose();
        _output.Dispose();
    }

    private sealed class ObservedWriter() : StringWriter(CultureInfo.InvariantCulture)
    {
        public bool WasDisposed { get; private set; }

        protected override void Dispose(bool disposing)
        {
            WasDisposed = true;
            base.Dispose(disposing);
        }
    }

    private sealed class PreparedViewEngine(Func<TrackedView> factory) : ICompositeViewEngine
    {
        public IReadOnlyList<IViewEngine> ViewEngines => [];
        public TrackedView? LastView { get; private set; }
        public int GetViewCalls { get; private set; }

        public ViewEngineResult GetView(string? executingFilePath, string viewPath, bool isMainPage)
        {
            Evidence.Require(executingFilePath == "/Views/Parent.cshtml" && viewPath == "_Probe" && !isMainPage,
                "The real parent page must own the actual successful partial lookup.");
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

internal sealed class ParentPage(HtmlHelper helper, object selectedModel, ViewDataDictionary parentViewData, bool asynchronous) : RazorPage
{
    private bool _publicCallFinished;
    private Task? _actualPublicTask;
    public bool Asynchronous { get; } = asynchronous;
    public bool BeforeWritten { get; private set; }
    public bool AfterWritten { get; private set; }
    public bool PublicCallSucceeded { get; private set; }
    public bool PublicCallFinished => Volatile.Read(ref _publicCallFinished);
    public Task? ActualPublicTask => Volatile.Read(ref _actualPublicTask);
    public Exception? PublicBoundaryFailure { get; private set; }
    public string? ObservedWriterType { get; private set; }

    public override async Task ExecuteAsync()
    {
        ObservedWriterType = ViewContext.Writer.GetType().FullName;
        Evidence.Require(ObservedWriterType == "Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.ViewBufferTextWriter" &&
            ReferenceEquals(helper.ViewContext, ViewContext),
            "A real parent RazorView must produce the page writer and HtmlHelper context.");
        WriteLiteral("before|");
        BeforeWritten = true;
        try
        {
            if (Asynchronous)
            {
                var task = helper.RenderPartialAsync("_Probe", selectedModel, parentViewData);
                Volatile.Write(ref _actualPublicTask, task);
                await task.ConfigureAwait(false);
            }
            else
            {
                helper.RenderPartial("_Probe", selectedModel, parentViewData);
            }
            PublicCallSucceeded = true;
        }
        catch (Exception exception)
        {
            PublicBoundaryFailure = exception;
            throw;
        }
        finally
        {
            Volatile.Write(ref _publicCallFinished, true);
        }
        WriteLiteral("|after");
        AfterWritten = true;
    }
}

internal sealed class TrackedView(RazorView owner, ProbePage page) : IView, IDisposable
{
    private Task? _actualRenderTask;
    public string Path => owner.Path;
    public ProbePage Page { get; } = page;
    public int RenderCalls { get; private set; }
    public int DisposeCalls { get; private set; }
    public Task? ActualRenderTask => Volatile.Read(ref _actualRenderTask);

    public Task RenderAsync(ViewContext context)
    {
        RenderCalls++;
        var task = owner.RenderAsync(context);
        Volatile.Write(ref _actualRenderTask, task);

        return task;
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
    public string? ObservedWriterType { get; private set; }

    public override async Task ExecuteAsync()
    {
        ObservedModel = ViewContext.ViewData.Model;
        ObservedViewData = ViewContext.ViewData;
        ObservedWriterType = ViewContext.Writer.GetType().FullName;
        WriteLiteral("<p>");
        if (gate is not null)
        {
            gate.ProducerThreadId = Environment.CurrentManagedThreadId;
            gate.Entered.Set();
            await gate.Completion.Task.ConfigureAwait(false);
        }
        WriteLiteral(payload);
        WriteLiteral("</p>");
        Completed = true;
    }
}
