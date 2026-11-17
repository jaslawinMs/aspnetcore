// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

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

internal sealed class TemplateGate : IDisposable
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

internal sealed class TemplateFixture : IDisposable
{
    private readonly ServiceProvider _services;
    private readonly EmptyModelMetadataProvider _metadata = new();
    private readonly IHtmlGenerator _generator = new Mock<IHtmlGenerator>(MockBehavior.Strict).Object;
    private readonly ICompositeViewEngine _unusedDefaultHelperEngine = new Mock<ICompositeViewEngine>(MockBehavior.Strict).Object;
    private readonly IRazorViewEngine _layoutEngine = new Mock<IRazorViewEngine>(MockBehavior.Strict).Object;
    private readonly IRazorPageActivator _activator;
    private readonly DiagnosticListener _diagnostics = new("AutoPerf.F031");

    public TemplateFixture()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMvcCore().AddViews();
        services.AddTransient<IHtmlHelper>(provider => new HtmlHelper(_generator, _unusedDefaultHelperEngine,
            _metadata, provider.GetRequiredService<IViewBufferScope>(), HtmlEncoder.Default, UrlEncoder.Default));
        _services = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        var activator = new Mock<IRazorPageActivator>(MockBehavior.Strict);
        activator.Setup(value => value.Activate(It.IsAny<IRazorPage>(), It.IsAny<ViewContext>()));
        _activator = activator.Object;
    }

    public TemplateRequest CreateRequest(string profile, TemplateGate? gate = null, bool findFallback = false)
    {
        return new TemplateRequest(_services.CreateScope(), _metadata, _generator, _layoutEngine, _activator,
            _diagnostics, profile, gate, findFallback);
    }

    public int RenderAndConsume(string profile)
    {
        using var request = CreateRequest(profile);
        request.Call();

        return request.ConsumedLength;
    }

    public void Dispose()
    {
        _diagnostics.Dispose();
        _services.Dispose();
    }
}

internal sealed class TemplateModel(string value)
{
    public string Value { get; } = value;
}

internal sealed class TemplateRequest : IDisposable
{
    private readonly IServiceScope _scope;
    private readonly HtmlHelper _helper;
    private readonly ViewContext _parentContext;
    private readonly PreparedTemplateEngine _engine;
    private readonly ObservedWriter _output = new();
    private readonly object _additionalMarker = new();
    private readonly bool _editor;
    private readonly bool _defaultDisplay;
    private bool _publicCallFinished;

    public TemplateRequest(IServiceScope scope, EmptyModelMetadataProvider metadata, IHtmlGenerator generator,
        IRazorViewEngine layoutEngine, IRazorPageActivator activator, DiagnosticListener diagnostics,
        string profile, TemplateGate? gate, bool findFallback)
    {
        _scope = scope;
        _editor = profile.StartsWith("Editor.", StringComparison.Ordinal);
        _defaultDisplay = profile.StartsWith("Display.Default", StringComparison.Ordinal);
        var length = profile.EndsWith("4096", StringComparison.Ordinal) ? 4096 : 32;
        Model = new TemplateModel("<&" + new string('x', length - 2));
        var encoded = HtmlEncoder.Default.Encode(Model.Value);
        Expected = "before|returned|" + (_defaultDisplay ? encoded : "<p>" + encoded + "</p>") + "|after";
        var http = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        var bufferScope = scope.ServiceProvider.GetRequiredService<IViewBufferScope>();
        ScopeType = bufferScope.GetType().FullName ?? throw new InvalidOperationException("Actual scoped buffer type required.");
        Evidence.Require(ScopeType == "Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope",
            "Resolve the real scoped MVC buffer owner, not a replacement.");
        ParentViewData = new ViewDataDictionary(metadata, new ModelStateDictionary()) { Model = Model };
        ParentViewData.TemplateInfo.HtmlFieldPrefix = "Parent";
        ParentViewData["parent-marker"] = Model;
        _engine = new PreparedTemplateEngine(_editor, _defaultDisplay, findFallback, () =>
        {
            var page = new TemplatePage(gate) { Path = "/Views/Shared/Probe.cshtml", HtmlEncoder = HtmlEncoder.Default };

            return new TrackedTemplate(new RazorView(layoutEngine, activator, [], page, HtmlEncoder.Default, diagnostics), page);
        });
        _helper = new HtmlHelper(generator, _engine, metadata, bufferScope, HtmlEncoder.Default, UrlEncoder.Default);
        var parent = new Mock<IView>(MockBehavior.Strict);
        parent.SetupGet(value => value.Path).Returns("/Views/Parent.cshtml");
        _parentContext = new ViewContext(new ActionContext(http, new RouteData(), new ActionDescriptor()),
            parent.Object, ParentViewData, new TempDataDictionary(http, new Mock<ITempDataProvider>(MockBehavior.Strict).Object),
            _output, new HtmlHelperOptions())
        { ExecutingFilePath = "/Views/Parent.cshtml" };
        _helper.Contextualize(_parentContext);
    }

    public TemplateModel Model { get; }
    public ViewDataDictionary ParentViewData { get; }
    public string ScopeType { get; }
    public string Expected { get; }
    public TrackedTemplate View => _engine.LastView ?? throw new InvalidOperationException("Actual custom template lookup did not occur.");
    public bool PublicCallFinished => Volatile.Read(ref _publicCallFinished);
    public bool PublicCallSucceeded { get; private set; }
    public Exception? PublicBoundaryFailure { get; private set; }
    public IHtmlContent? ReturnedContent { get; private set; }
    public string Consumed => _output.ToString();
    public int ConsumedLength => _output.GetStringBuilder().Length;
    public bool RootWriterDisposed => _output.WasDisposed;

    public void Call()
    {
        _output.Write("before|");
        IHtmlContent content;
        try
        {
            var extra = new Dictionary<string, object> { ["additional-marker"] = _additionalMarker };
            content = _editor
                ? _helper.Editor(nameof(TemplateModel.Value), "Probe", "Field", extra)
                : _helper.Display(nameof(TemplateModel.Value), _defaultDisplay ? "String" : "Probe", "Field", extra);
            ReturnedContent = content;
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
        _output.Write("returned|");
        content.WriteTo(_output, HtmlEncoder.Default);
        _output.Write("|after");
    }

    public object Capture(string label, bool success)
    {
        Evidence.Require(_engine.GetViewCalls == 1 && _engine.FindViewCalls == (_defaultDisplay || _engine.FindFallback ? 1 : 0),
            "Actual selected custom/built-in template lookup differs.");
        Evidence.Require(PublicCallFinished && PublicCallSucceeded == success &&
            (success ? Consumed == Expected : Consumed == "before|"),
            "Public synchronous completion, returned-content consumption or ordered output differs.");
        Evidence.Require(!RootWriterDisposed && ReferenceEquals(_parentContext.Writer, _output) &&
            ReferenceEquals(ParentViewData.Model, Model) && ReferenceEquals(ParentViewData["parent-marker"], Model) &&
            !ParentViewData.ContainsKey("template-only") && !ParentViewData.ContainsKey("additional-marker"),
            "Rendering changed caller-owned writer/model/ViewData state.");
        if (!_defaultDisplay)
        {
            Evidence.Require(View.RenderCalls == 1 && View.DisposeCalls == 1 && View.Page.Completed == success &&
                View.ActualRenderTask is { IsCompleted: true } &&
                ReferenceEquals(View.Page.ObservedModel, Model.Value) &&
                !ReferenceEquals(View.Page.ObservedViewData, ParentViewData) &&
                ReferenceEquals(View.Page.ObservedViewData?["parent-marker"], Model) &&
                ReferenceEquals(View.Page.ObservedViewData?["additional-marker"], _additionalMarker) &&
                Equals(View.Page.ObservedViewData?.TemplateInfo.FormattedModelValue, Model.Value) &&
                View.Page.ObservedViewData?.TemplateInfo.HtmlFieldPrefix == "Parent.Field" &&
                View.Page.ObservedWriterType == "Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.ViewBufferTextWriter",
                "Real template task, child model/ViewData/prefix/format/encoding or view disposal differs.");
        }

        return new
        {
            label,
            success,
            actualPublicCallFinished = PublicCallFinished,
            actualPublicCallSucceeded = PublicCallSucceeded,
            actualPublicBoundaryExceptionType = PublicBoundaryFailure?.GetType().FullName,
            actualReturnedContentType = ReturnedContent?.GetType().FullName,
            actualRootWriterText = Consumed,
            expectedOnSuccess = Expected,
            actualRootWriterDisposed = RootWriterDisposed,
            actualCallerWriterRestored = true,
            actualLookupCalls = _engine.GetViewCalls,
            actualFindViewCalls = _engine.FindViewCalls,
            actualCustomViewSelected = !_defaultDisplay,
            actualTemplateViewRenderCalls = _engine.LastView?.RenderCalls,
            actualTemplateViewDisposeCalls = _engine.LastView?.DisposeCalls,
            actualTemplateTaskCompleted = _engine.LastView?.ActualRenderTask?.IsCompleted,
            actualTemplateTaskSucceeded = _engine.LastView?.ActualRenderTask?.IsCompletedSuccessfully,
            actualTemplateWriterType = _engine.LastView?.Page.ObservedWriterType,
            actualModelAndViewDataContractsMatched = true,
            actualScopeImplementation = ScopeType,
            actualOwnerType = typeof(HtmlHelper).FullName,
            actualRendererType = _defaultDisplay ? "Built-in String display template" : typeof(RazorView).FullName,
            actualProducerType = _defaultDisplay ? null : typeof(TemplatePage).FullName,
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

    private sealed class PreparedTemplateEngine(bool editor, bool defaultDisplay, bool findFallback, Func<TrackedTemplate> factory) : ICompositeViewEngine
    {
        public IReadOnlyList<IViewEngine> ViewEngines => [];
        public TrackedTemplate? LastView { get; private set; }
        public int GetViewCalls { get; private set; }
        public int FindViewCalls { get; private set; }
        public bool FindFallback { get; } = findFallback;

        public ViewEngineResult GetView(string? executingFilePath, string viewPath, bool isMainPage)
        {
            Evidence.Require(executingFilePath == "/Views/Parent.cshtml" && viewPath == (defaultDisplay ? "String" : "Probe") &&
                !isMainPage, "Actual public helper template lookup differs.");
            GetViewCalls++;
            if (defaultDisplay || FindFallback)
            {
                return ViewEngineResult.NotFound(viewPath, []);
            }
            LastView = factory();

            return ViewEngineResult.Found(viewPath, LastView);
        }

        public ViewEngineResult FindView(ActionContext context, string viewName, bool isMainPage)
        {
            Evidence.Require((defaultDisplay || FindFallback) && !isMainPage &&
                viewName == (editor ? "EditorTemplates/" : "DisplayTemplates/") + (defaultDisplay ? "String" : "Probe"),
                "Actual mode-specific template lookup fallback differs.");
            FindViewCalls++;
            if (defaultDisplay)
            {
                return ViewEngineResult.NotFound(viewName, []);
            }
            LastView = factory();

            return ViewEngineResult.Found(viewName, LastView);
        }
    }
}

internal sealed class TrackedTemplate(RazorView owner, TemplatePage page) : IView, IDisposable
{
    private Task? _actualRenderTask;
    public string Path => owner.Path;
    public TemplatePage Page { get; } = page;
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

internal sealed class TemplatePage(TemplateGate? gate) : RazorPage
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
        ViewContext.ViewData["template-only"] = "isolated";
        WriteLiteral("<p>");
        if (gate is not null)
        {
            gate.ProducerThreadId = Environment.CurrentManagedThreadId;
            gate.Entered.Set();
            await gate.Completion.Task.ConfigureAwait(false);
        }
        Write(ObservedModel as string ?? throw new InvalidOperationException("Actual selected template string model required."));
        WriteLiteral("</p>");
        Completed = true;
    }
}
