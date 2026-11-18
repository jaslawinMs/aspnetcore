// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Diagnostics;
using System.Globalization;
using System.Linq.Expressions;
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
using Microsoft.AspNetCore.Razor.Hosting;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

internal sealed record RegistrationSpec(string Name, int Count, int NamePadding = 0)
{
    internal static readonly RegistrationSpec[] All =
    [
        new("NoSections", 0), new("One", 1), new("Two", 2),
        new("Eight", 8), new("SixtyFour", 64), new("EightLong", 8, 256)
    ];

    internal string Identifier => "/Views/" + Name + ".cshtml";
    internal string[] Names => Enumerable.Range(0, Count)
        .Select(index => "Section" + new string('A', NamePadding) + index.ToString("D3", CultureInfo.InvariantCulture)).ToArray();
}

internal static class CompiledPages
{
    private static readonly IReadOnlyDictionary<string, Func<RazorPage>> Factories = Discover();

    internal static Func<RazorPage> GetFactory(RegistrationSpec spec) => Factories[spec.Identifier];

    private static IReadOnlyDictionary<string, Func<RazorPage>> Discover()
    {
        var items = new RazorCompiledItemLoader().LoadItems(typeof(CompiledPages).Assembly).ToArray();
        Evidence.Require(items.Length == RegistrationSpec.All.Length, "Require all six actual SDK-compiled cshtml producers.");
        var factories = new Dictionary<string, Func<RazorPage>>(StringComparer.Ordinal);
        foreach (var spec in RegistrationSpec.All)
        {
            var item = items.Single(item => item.Identifier == spec.Identifier);
            Evidence.Require(typeof(RazorPage).IsAssignableFrom(item.Type) && item.Type.Assembly == typeof(CompiledPages).Assembly,
                "The section producer must be an actual SDK-compiled page in the frozen common harness.");
            factories.Add(item.Identifier, Expression.Lambda<Func<RazorPage>>(Expression.New(item.Type)).Compile());
        }

        return factories;
    }
}

internal readonly record struct RenderingSnapshot(string Profile, string Written, int Sections, int ConsumedTokens,
    bool OriginalDictionaryTransferred, bool ContentMarkedForLayout, string BufferScopeType, string CompiledContentType);

internal sealed class RegistrationScenario : IDisposable
{
    private const string LayoutPath = "/Views/Shared/_RegistrationLayout.cshtml";
    private readonly RegistrationSpec _spec;
    private readonly Func<RazorPage> _factory;
    private readonly string[] _names;
    private readonly string _expectedHtml;
    private readonly ServiceProvider _provider;
    private readonly DiagnosticListener _diagnostics = new("AutoPerf.F043");
    private readonly ViewContext _registrationContext;
    private readonly string _bufferType;
    private RenderingSnapshot _lastRendering;

    internal RegistrationScenario(RegistrationSpec spec)
    {
        _spec = spec;
        _factory = CompiledPages.GetFactory(spec);
        _names = spec.Names;
        _expectedHtml = "<body/>" + string.Concat(_names.Select(name => "<s>" + name + "</s>"));
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMvcCore().AddViews().AddRazorViewEngine();
        _provider = services.BuildServiceProvider();
        using var scope = _provider.CreateScope();
        _bufferType = scope.ServiceProvider.GetRequiredService<IViewBufferScope>().GetType().FullName!;
        Evidence.Require(_bufferType == "Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope",
            "Require actual scoped pooled view buffering.");
        _registrationContext = CreateContext(_provider, new RegistrationContextOnlyView(), TextWriter.Null);
    }

    internal int RegisterFreshPage()
    {
        var page = NewPage(_registrationContext);
        page.ExecuteAsync().GetAwaiter().GetResult();
        var count = page.SectionWriters.Count;
        Evidence.Require(count == _spec.Count, "The real compiled producer did not register every expected section.");
        GC.KeepAlive(page);

        return count;
    }

    internal async Task<int> RenderFullView()
    {
        using var scope = _provider.CreateScope();
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        var content = _factory();
        content.Path = _spec.Identifier;
        content.Layout = LayoutPath;
        content.HtmlEncoder = HtmlEncoder.Default;
        var layout = new RegistrationLayout(_names)
        {
            Path = LayoutPath,
            HtmlEncoder = HtmlEncoder.Default
        };
        var view = new RazorView(new LayoutLocator(layout), new EmptyActivator(), [],
            content, HtmlEncoder.Default, _diagnostics);
        var context = CreateContext(scope.ServiceProvider, view, writer);
        await view.RenderAsync(context);
        var written = writer.ToString();
        Evidence.Require(written == _expectedHtml && layout.Tokens == _spec.Count
            && content.SectionWriters.Count == _spec.Count
            && ReferenceEquals(layout.PreviousSectionWriters, content.SectionWriters)
            && content.IsLayoutBeingRendered, "The actual RazorView transfer/token/final HTML contract differs.");
        _lastRendering = new RenderingSnapshot(_spec.Name, written, content.SectionWriters.Count, layout.Tokens,
            true, content.IsLayoutBeingRendered, _bufferType, content.GetType().FullName!);

        return written.Length;
    }

    internal object Verify()
    {
        using var scope = _provider.CreateScope();
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        var page = NewPage(CreateContext(scope.ServiceProvider, new RegistrationContextOnlyView(), writer));
        var originalStore = page.SectionWriters;
        Evidence.Require(originalStore.GetType() == typeof(Dictionary<string, RenderAsyncDelegate>)
            && originalStore.Count == 0 && ReferenceEquals(originalStore, page.SectionWriters),
            "The verified concrete, get-only, initially empty section-store invariant differs.");
        page.ExecuteAsync().GetAwaiter().GetResult();
        var entries = page.SectionWriters.ToArray();
        Evidence.Require(entries.Select(pair => pair.Key).SequenceEqual(_names)
            && writer.ToString() == string.Empty && ReferenceEquals(originalStore, page.SectionWriters)
            && entries.All(pair => pair.Value.Method.Module.Assembly == typeof(CompiledPages).Assembly),
            "Actual compiled registration changed names, order, identity, deferral or producer origin.");
        Evidence.Require(RegisterFreshPage() == _spec.Count, "Fresh actual compiled registration failed.");
        RenderFullView().GetAwaiter().GetResult();

        return new
        {
            profile = _spec.Name,
            actualExpectedCount = _spec.Count,
            actualNames = entries.Select(pair => pair.Key).ToArray(),
            actualRegistrationOutput = writer.ToString(),
            actualOriginalDictionaryPreserved = ReferenceEquals(originalStore, page.SectionWriters),
            actualDictionaryType = originalStore.GetType().FullName,
            actualCompiledPage = page.GetType().FullName,
            actualCallbacks = entries.Select(pair => new
            {
                name = pair.Key,
                method = pair.Value.Method.Name,
                declaringType = pair.Value.Method.DeclaringType?.FullName,
                targetType = pair.Value.Target?.GetType().FullName,
                assembly = pair.Value.Method.Module.Assembly.Location
            }).ToArray(),
            actualRendering = _lastRendering
        };
    }

    private RazorPage NewPage(ViewContext context)
    {
        var page = _factory();
        page.Path = _spec.Identifier;
        page.HtmlEncoder = HtmlEncoder.Default;
        page.ViewContext = context;

        return page;
    }

    private static ViewContext CreateContext(IServiceProvider services, IView view, TextWriter writer)
    {
        var http = new DefaultHttpContext { RequestServices = services };

        return new ViewContext(new ActionContext(http, new RouteData(), new ActionDescriptor()),
            view, new ViewDataDictionary(new EmptyModelMetadataProvider(), new ModelStateDictionary()),
            new TempDataDictionary(http, new EmptyTempData()), writer, new HtmlHelperOptions());
    }

    public void Dispose()
    {
        _diagnostics.Dispose();
        _provider.Dispose();
    }

    private sealed class RegistrationContextOnlyView : IView
    {
        public string Path => "/RegistrationContextOnly";
        public Task RenderAsync(ViewContext context) => throw new InvalidOperationException("Registration-only context must not render a view.");
    }

    private sealed class RegistrationLayout(string[] names) : RazorPage
    {
        public int Tokens { get; private set; }

        public override async Task ExecuteAsync()
        {
            WriteLiteral("<body/>");
            Write(RenderBody());
            foreach (var name in names)
            {
                var token = await RenderSectionAsync(name);
                Evidence.Require(ReferenceEquals(token, HtmlString.Empty), "A present rendered section must return its actual empty HTML token.");
                Tokens++;
            }
        }
    }

    private sealed class EmptyActivator : IRazorPageActivator
    {
        public void Activate(IRazorPage page, ViewContext context)
        {
        }
    }

    private sealed class LayoutLocator(IRazorPage layout) : IRazorViewEngine
    {
        public RazorPageResult GetPage(string? executingFilePath, string pagePath)
        {
            Evidence.Require(pagePath == LayoutPath, "Unexpected layout lookup.");

            return new RazorPageResult(pagePath, layout);
        }

        public RazorPageResult FindPage(ActionContext context, string pageName) => throw new InvalidOperationException("Unexpected fallback lookup.");
        public ViewEngineResult FindView(ActionContext context, string viewName, bool isMainPage) => throw new InvalidOperationException("Unexpected view lookup.");
        public ViewEngineResult GetView(string? executingFilePath, string viewPath, bool isMainPage) => throw new InvalidOperationException("Unexpected view lookup.");
        public string? GetAbsolutePath(string? executingFilePath, string? pagePath) => pagePath;
    }

    private sealed class EmptyTempData : ITempDataProvider
    {
        public IDictionary<string, object> LoadTempData(HttpContext context) => new Dictionary<string, object>();

        public void SaveTempData(HttpContext context, IDictionary<string, object> values)
        {
        }
    }
}
