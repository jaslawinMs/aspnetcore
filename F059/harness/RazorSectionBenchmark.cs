using System.Collections;
using System.Diagnostics;
using System.Globalization;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
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

[MemoryDiagnoser]
public class RazorSectionBenchmark
{
    private SectionWorkload _workload = null!;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;
    public IEnumerable<string> Cases => Corpus.Cases;

    [GlobalSetup]
    public void Setup()
    {
        _workload = new SectionWorkload(Case);
        var contract = Contracts.VerifyTwice(_workload);
        Contracts.VerifyOriginal(contract);
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(contract));
    }

    [Benchmark]
    public int Render() => _workload.Run();

    [GlobalCleanup]
    public void Cleanup() => _workload.Dispose();
}

internal enum Scenario
{
    Normal, OptionalMissing, RequiredMissing, Duplicate, DelegateFailure,
    DuplicateRemoved, OptionalThenDefine, RequiredThenDefine, LookupFailureAfterRender,
    LookupFailureBeforeRender, ComparerFailureAfterRender, ReentrantLookup
}

internal enum DictionaryKind { Original, Wrapper, Ordinal, Subclass, CustomComparer }

internal sealed record CaseSpec(string Name, bool FullView, int Count, int NameLength = 16,
    bool AlternateCase = false, Scenario Scenario = Scenario.Normal,
    DictionaryKind DictionaryKind = DictionaryKind.Original);

internal static class Corpus
{
    public static readonly CaseSpec[] Specs =
    [
        new("View_NoSections", true, 0),
        new("View_1_Short", true, 1),
        new("View_2_Short", true, 2),
        new("View_8_Short", true, 8),
        new("View_32_Short", true, 32),
        new("View_128_Short", true, 128),
        new("View_8_Long", true, 8, 256),
        new("View_32_Long", true, 32, 256),
        new("View_128_Long", true, 128, 256),
        new("View_8_AlternateCase", true, 8, AlternateCase: true),
        new("View_OptionalMissing", true, 1, Scenario: Scenario.OptionalMissing),
        new("View_RequiredMissing", true, 1, Scenario: Scenario.RequiredMissing),
        new("View_Duplicate", true, 1, Scenario: Scenario.Duplicate),
        new("View_DelegateFailure", true, 1, Scenario: Scenario.DelegateFailure),
        new("Page_32_Short", false, 32),
        new("Page_128_Long", false, 128, 256),
        new("Page_Wrapper_32", false, 32, DictionaryKind: DictionaryKind.Wrapper),
        new("Page_Ordinal_32", false, 32, DictionaryKind: DictionaryKind.Ordinal),
        new("Page_Subclass_32", false, 32, DictionaryKind: DictionaryKind.Subclass),
        new("Page_DuplicateRemoved", false, 1, Scenario: Scenario.DuplicateRemoved),
        new("Page_OptionalThenDefine", false, 0, Scenario: Scenario.OptionalThenDefine),
        new("Page_RequiredThenDefine", false, 0, Scenario: Scenario.RequiredThenDefine),
        new("Page_LookupFailureAfterRender", false, 1, Scenario: Scenario.LookupFailureAfterRender, DictionaryKind: DictionaryKind.Wrapper),
        new("Page_LookupFailureBeforeRender", false, 1, Scenario: Scenario.LookupFailureBeforeRender, DictionaryKind: DictionaryKind.Wrapper),
        new("Page_ComparerFailureAfterRender", false, 1, Scenario: Scenario.ComparerFailureAfterRender, DictionaryKind: DictionaryKind.CustomComparer),
        new("Page_ReentrantLookup", false, 1, Scenario: Scenario.ReentrantLookup, DictionaryKind: DictionaryKind.Wrapper)
    ];

    public static readonly string[] Cases = Specs.Select(spec => spec.Name).ToArray();
}

internal sealed class SectionWorkload : IDisposable
{
    private readonly CaseSpec _spec;
    private readonly string[] _names;
    private readonly string[] _requests;
    private readonly string[] _values;
    private readonly ServiceProvider _provider;
    private readonly DiagnosticListener _diagnostics = new("AutoPerf.Razor");
    private readonly string _bufferType;
    private ContentPage _content = null!;
    private LayoutPage _layout = null!;
    private StringWriter _writer = null!;
    private Exception? _error;
    private Exception? _recoveryError;
    private LookupDictionary? _lookup;
    private FaultingComparer? _comparer;

    public SectionWorkload(string name)
    {
        _spec = Corpus.Specs.Single(spec => spec.Name == name);
        _names = Enumerable.Range(0, Math.Max(1, _spec.Count))
            .Select(index => "Section_" + new string('a', _spec.NameLength) + index.ToString("D3", CultureInfo.InvariantCulture)).ToArray();
        _requests = _names.Select(value => _spec.AlternateCase ? value.ToUpperInvariant() : value).ToArray();
        _values = _names.Select(value => "<s>" + value + "</s>").ToArray();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMvcCore().AddViews().AddRazorViewEngine();
        _provider = services.BuildServiceProvider();
        using var scope = _provider.CreateScope();
        _bufferType = scope.ServiceProvider.GetRequiredService<IViewBufferScope>().GetType().FullName!;
        if (_bufferType != "Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope")
        {
            throw new InvalidOperationException("Production pooled view-buffer registration missing.");
        }
    }

    public int Run()
    {
        _error = null;
        _recoveryError = null;
        _lookup = null;
        _comparer = null;
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        _writer = writer;
        using var scope = _provider.CreateScope();
        _content = new ContentPage(_spec, _names, _values);
        _layout = new LayoutPage(_spec, _requests);
        var view = new RazorView(new LayoutEngine(_layout), new PageActivator(), [],
            _content, HtmlEncoder.Default, _diagnostics);
        var http = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        var context = new ViewContext(new ActionContext(http, new RouteData(), new ActionDescriptor()),
            view, new ViewDataDictionary(new EmptyModelMetadataProvider(), new ModelStateDictionary()),
            new TempDataDictionary(http, new EmptyTempDataProvider()), _writer, new HtmlHelperOptions());

        try
        {
            if (_spec.FullView)
            {
                view.RenderAsync(context).GetAwaiter().GetResult();
            }
            else
            {
                _content.ViewContext = context;
                _layout.ViewContext = context;
                context.ExecutingFilePath = _layout.Path;
                _content.ExecuteAsync().GetAwaiter().GetResult();
                _layout.PreviousSectionWriters = CreateDictionary();
                RunPage();
            }
        }
        catch (Exception exception) when (ExpectedError(exception))
        {
            _error = exception;
        }

        if (_spec.Scenario == Scenario.DelegateFailure)
        {
            try
            {
                _layout.RenderSectionAsync(_requests[0]).GetAwaiter().GetResult();
            }
            catch (InvalidOperationException exception) when (exception.Message == DuplicateMessage())
            {
                _recoveryError = exception;
            }
            if (_recoveryError is null)
            {
                throw new InvalidOperationException("Delegate failure did not preserve rendered-section state.");
            }
        }

        return _content.Invocations + _layout.Tokens + _layout.NullTokens;
    }

    private bool ExpectedError(Exception exception) => _spec.Scenario switch
    {
        Scenario.RequiredMissing => exception is InvalidOperationException && exception.Message == MissingMessage("Absent"),
        Scenario.Duplicate or Scenario.DuplicateRemoved or Scenario.LookupFailureAfterRender or Scenario.ComparerFailureAfterRender
            => exception is InvalidOperationException && exception.Message == DuplicateMessage(),
        Scenario.DelegateFailure => exception is ProbeException && exception.Message == "delegate-failure",
        _ => false
    };

    private string DuplicateMessage() => $"RenderSectionAsync invocation in '/Views/Shared/_Layout.cshtml' is invalid. The section '{_requests[0]}' has already been rendered.";
    private static string MissingMessage(string name) => $"The layout page '/Views/Shared/_Layout.cshtml' cannot find the section '{name}' in the content page '/Views/Content.cshtml'.";

    private IDictionary<string, RenderAsyncDelegate> CreateDictionary() => _spec.DictionaryKind switch
    {
        DictionaryKind.Original => _content.SectionWriters,
        DictionaryKind.Ordinal => new Dictionary<string, RenderAsyncDelegate>(_content.SectionWriters, StringComparer.Ordinal),
        DictionaryKind.Subclass => new SectionDictionary(_content.SectionWriters),
        DictionaryKind.Wrapper => _lookup = new LookupDictionary(_content.SectionWriters),
        DictionaryKind.CustomComparer => new Dictionary<string, RenderAsyncDelegate>(_content.SectionWriters, _comparer = new FaultingComparer()),
        _ => throw new InvalidOperationException("Unrecognized dictionary case.")
    };

    private void RunPage()
    {
        switch (_spec.Scenario)
        {
            case Scenario.OptionalThenDefine:
            case Scenario.RequiredThenDefine:
                try
                {
                    _layout.RenderMissing(_requests[0], _spec.Scenario == Scenario.RequiredThenDefine);
                }
                catch (InvalidOperationException exception) when (_spec.Scenario == Scenario.RequiredThenDefine && exception.Message == MissingMessage(_requests[0]))
                {
                    _error = exception;
                }
                _content.DefineAdditional();
                _layout.RenderOne(_requests[0]);
                _layout.EnsureRenderedBodyOrSections();
                break;
            case Scenario.LookupFailureBeforeRender:
                _lookup!.ThrowOnLookup = true;
                try
                {
                    _layout.RenderOne(_requests[0]);
                }
                catch (ProbeException exception) when (exception.Message == "lookup-failure")
                {
                    _error = exception;
                }
                _lookup.ThrowOnLookup = false;
                _layout.RenderOne(_requests[0]);
                _layout.EnsureRenderedBodyOrSections();
                break;
            case Scenario.ReentrantLookup:
                _lookup!.OnLookup = () =>
                {
                    _lookup.OnLookup = null;
                    _layout.RenderOne(_requests[0]);
                };
                _layout.RenderOne(_requests[0]);
                _layout.EnsureRenderedBodyOrSections();
                break;
            default:
                _layout.ExecuteAsync().GetAwaiter().GetResult();
                if (_spec.Scenario == Scenario.DuplicateRemoved)
                {
                    _layout.PreviousSectionWriters.Remove(_names[0]);
                    _layout.RenderOne(_requests[0]);
                }
                else if (_spec.Scenario == Scenario.LookupFailureAfterRender)
                {
                    _lookup!.ThrowOnLookup = true;
                    _layout.RenderOne(_requests[0]);
                }
                else if (_spec.Scenario == Scenario.ComparerFailureAfterRender)
                {
                    _comparer!.ThrowOnHash = true;
                    _layout.RenderOne(_requests[0]);
                }
                else
                {
                    _layout.EnsureRenderedBodyOrSections();
                }
                break;
        }
    }

    public SectionContract Capture()
    {
        Run();
        var contract = new SectionContract(_spec.Name,
            _spec.FullView ? "Actual RazorView registration/transfer/scoped pooled buffering" : "Page-only registration/caller dictionary diagnostic;RazorView transfer bypassed",
            _writer.ToString(), _content.Invocations, _layout.Tokens, _layout.NullTokens, _layout.EmptyTokens,
            _error?.GetType().FullName, _error?.Message, _recoveryError?.GetType().FullName, _recoveryError?.Message,
            ReferenceEquals(_layout.PreviousSectionWriters, _content.SectionWriters),
            _layout.PreviousSectionWriters.GetType().FullName!, _lookup?.Lookups,
            _layout.PreviousSectionWriters.Keys.ToArray(), _spec.FullView ? _bufferType : null);
        Validate(contract);
        return contract;
    }

    private void Validate(SectionContract contract)
    {
        var error = _spec.Scenario is Scenario.RequiredMissing or Scenario.Duplicate or Scenario.DelegateFailure
            or Scenario.DuplicateRemoved or Scenario.RequiredThenDefine or Scenario.LookupFailureBeforeRender
            or Scenario.LookupFailureAfterRender or Scenario.ComparerFailureAfterRender;
        if ((contract.ErrorType is not null) != error || !contract.EmptyTokens)
        {
            throw new InvalidOperationException("Required error/empty return token contract not reached.");
        }
        var invocations = _spec.Scenario switch
        {
            Scenario.OptionalThenDefine or Scenario.RequiredThenDefine or Scenario.LookupFailureBeforeRender => 1,
            Scenario.ReentrantLookup => 2,
            _ => _spec.Count
        };
        var expectedWritten = _spec.FullView && error ? string.Empty
            : (_spec.FullView ? "<body/>" : string.Empty)
                + (_spec.Scenario == Scenario.ReentrantLookup ? _values[0] + _values[0]
                    : string.Concat(_values.Take(invocations)));
        if (contract.Invocations != invocations || contract.Written != expectedWritten)
        {
            throw new InvalidOperationException("Actual delegate producer/output did not reach the expected boundary.");
        }
        if (_spec.DictionaryKind == DictionaryKind.Original && !contract.OriginalDictionaryTransferred)
        {
            throw new InvalidOperationException("Actual original content dictionary not retained.");
        }
        if (_spec.Scenario == Scenario.LookupFailureAfterRender && contract.Lookups != 1
            || _spec.Scenario is Scenario.LookupFailureBeforeRender or Scenario.ReentrantLookup && contract.Lookups != 2)
        {
            throw new InvalidOperationException("Custom lookup precedence/reentrancy was not reached.");
        }
        if (_spec.Scenario == Scenario.ComparerFailureAfterRender && _comparer!.FailedHashCalls != 0)
        {
            throw new InvalidOperationException("Custom comparer ran before duplicate-section rejection.");
        }
    }

    public void Dispose()
    {
        _diagnostics.Dispose();
        _provider.Dispose();
    }
}

internal sealed class ContentPage : RazorPage
{
    private readonly CaseSpec spec;
    private readonly string[] names;
    private readonly string[] values;

    public ContentPage(CaseSpec spec, string[] names, string[] values)
    {
        this.spec = spec;
        this.names = names;
        this.values = values;
        Path = "/Views/Content.cshtml";
        HtmlEncoder = System.Text.Encodings.Web.HtmlEncoder.Default;
    }

    public int Invocations { get; private set; }

    public override Task ExecuteAsync()
    {
        if (spec.FullView)
        {
            Layout = "/Views/Shared/_Layout.cshtml";
            WriteLiteral("<body/>");
        }
        for (var index = 0; index < spec.Count; index++)
        {
            var item = index;
            DefineSection(names[item], () => RenderValue(item));
        }
        return Task.CompletedTask;
    }

    public void DefineAdditional() => DefineSection(names[0], () => RenderValue(0));

    private Task RenderValue(int index)
    {
        Invocations++;
        if (spec.Scenario == Scenario.DelegateFailure)
        {
            throw new ProbeException("delegate-failure");
        }
        WriteLiteral(values[index]);
        return Task.CompletedTask;
    }
}

internal sealed class LayoutPage : RazorPage
{
    private readonly CaseSpec spec;
    private readonly string[] requests;

    public LayoutPage(CaseSpec spec, string[] requests)
    {
        this.spec = spec;
        this.requests = requests;
        Path = "/Views/Shared/_Layout.cshtml";
        HtmlEncoder = System.Text.Encodings.Web.HtmlEncoder.Default;
    }

    public int Tokens { get; private set; }
    public int NullTokens { get; private set; }
    public bool EmptyTokens { get; private set; } = true;

    public override Task ExecuteAsync()
    {
        if (spec.FullView)
        {
            Write(RenderBody());
        }
        for (var index = 0; index < spec.Count; index++)
        {
            RenderOne(requests[index]);
        }
        if (spec.Scenario is Scenario.OptionalMissing or Scenario.RequiredMissing)
        {
            RenderMissing("Absent", spec.Scenario == Scenario.RequiredMissing);
        }
        else if (spec.Scenario == Scenario.Duplicate)
        {
            RenderOne(requests[0]);
        }
        return Task.CompletedTask;
    }

    public void RenderOne(string name)
    {
        var token = RenderSectionAsync(name).GetAwaiter().GetResult();
        EmptyTokens &= ReferenceEquals(token, HtmlString.Empty);
        Tokens++;
        Write(token);
    }

    public void RenderMissing(string name, bool required)
    {
        var token = RenderSectionAsync(name, required).GetAwaiter().GetResult();
        if (token is not null)
        {
            throw new InvalidOperationException("Missing optional section returned a non-null token.");
        }
        NullTokens++;
    }
}

internal sealed class LookupDictionary(IDictionary<string, RenderAsyncDelegate> original) : IDictionary<string, RenderAsyncDelegate>
{
    private readonly Dictionary<string, RenderAsyncDelegate> _items = new(original, StringComparer.OrdinalIgnoreCase);
    public bool ThrowOnLookup { get; set; }
    public Action? OnLookup { get; set; }
    public int Lookups { get; private set; }

    public bool TryGetValue(string key, out RenderAsyncDelegate value)
    {
        Lookups++;
        if (ThrowOnLookup)
        {
            throw new ProbeException("lookup-failure");
        }
        OnLookup?.Invoke();
        return _items.TryGetValue(key, out value!);
    }

    public RenderAsyncDelegate this[string key] { get => _items[key]; set => _items[key] = value; }
    public ICollection<string> Keys => _items.Keys;
    public ICollection<RenderAsyncDelegate> Values => _items.Values;
    public int Count => _items.Count;
    public bool IsReadOnly => false;
    public void Add(string key, RenderAsyncDelegate value) => _items.Add(key, value);
    public bool ContainsKey(string key) => _items.ContainsKey(key);
    public bool Remove(string key) => _items.Remove(key);
    public void Add(KeyValuePair<string, RenderAsyncDelegate> item) => ((ICollection<KeyValuePair<string, RenderAsyncDelegate>>)_items).Add(item);
    public void Clear() => _items.Clear();
    public bool Contains(KeyValuePair<string, RenderAsyncDelegate> item) => ((ICollection<KeyValuePair<string, RenderAsyncDelegate>>)_items).Contains(item);
    public void CopyTo(KeyValuePair<string, RenderAsyncDelegate>[] array, int index) => ((ICollection<KeyValuePair<string, RenderAsyncDelegate>>)_items).CopyTo(array, index);
    public bool Remove(KeyValuePair<string, RenderAsyncDelegate> item) => ((ICollection<KeyValuePair<string, RenderAsyncDelegate>>)_items).Remove(item);
    public IEnumerator<KeyValuePair<string, RenderAsyncDelegate>> GetEnumerator() => _items.GetEnumerator();
    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

internal sealed class SectionDictionary(IDictionary<string, RenderAsyncDelegate> original)
    : Dictionary<string, RenderAsyncDelegate>(original, StringComparer.OrdinalIgnoreCase)
{
}

internal sealed class FaultingComparer : IEqualityComparer<string>
{
    public bool ThrowOnHash { get; set; }
    public int FailedHashCalls { get; private set; }
    public bool Equals(string? first, string? second) => StringComparer.OrdinalIgnoreCase.Equals(first, second);

    public int GetHashCode(string value)
    {
        if (ThrowOnHash)
        {
            FailedHashCalls++;
            throw new ProbeException("comparer-failure");
        }
        return StringComparer.OrdinalIgnoreCase.GetHashCode(value);
    }
}

internal sealed class ProbeException(string message) : Exception(message)
{
}

internal sealed class PageActivator : IRazorPageActivator
{
    public void Activate(IRazorPage page, ViewContext context) { }
}

internal sealed class LayoutEngine(IRazorPage layout) : IRazorViewEngine
{
    public RazorPageResult GetPage(string executingFilePath, string pagePath) => new(pagePath, layout);
    public RazorPageResult FindPage(ActionContext context, string pageName) => throw new InvalidOperationException("Unexpected layout fallback.");
    public ViewEngineResult FindView(ActionContext context, string viewName, bool isMainPage) => throw new InvalidOperationException("Unexpected view lookup.");
    public ViewEngineResult GetView(string? executingFilePath, string viewPath, bool isMainPage) => throw new InvalidOperationException("Unexpected view lookup.");
    public string? GetAbsolutePath(string? executingFilePath, string? pagePath) => throw new InvalidOperationException("Unexpected path resolution.");
}

internal sealed class EmptyTempDataProvider : ITempDataProvider
{
    public IDictionary<string, object> LoadTempData(HttpContext context) => new Dictionary<string, object>();
    public void SaveTempData(HttpContext context, IDictionary<string, object> values) { }
}

internal sealed record SectionContract(string Case, string Scope, string Written, int Invocations,
    int Tokens, int NullTokens, bool EmptyTokens, string? ErrorType, string? ErrorMessage,
    string? RecoveryErrorType, string? RecoveryErrorMessage, bool OriginalDictionaryTransferred,
    string DictionaryType, int? Lookups, string[] SectionKeys, string? BufferType);

internal static class OwnerProbe
{
    public static void Verify()
    {
        var assembly = typeof(RazorPage).Assembly;
        var expected = Path.Combine(AppContext.BaseDirectory, "Microsoft.AspNetCore.Mvc.Razor.dll");
        if (!Path.GetFullPath(assembly.Location).Equals(Path.GetFullPath(expected), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Frozen local Razor owner was not loaded.");
        }
        Console.WriteLine("AUTOPERF_OWNER " + JsonSerializer.Serialize(new
        {
            assembly.Location, Mvid = assembly.ManifestModule.ModuleVersionId,
            SHA256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location)))
        }));
    }
}

internal static class Contracts
{
    public static SectionContract VerifyTwice(SectionWorkload workload)
    {
        var first = workload.Capture();
        var second = workload.Capture();
        if (JsonSerializer.Serialize(first) != JsonSerializer.Serialize(second))
        {
            throw new InvalidOperationException("Repeated full section/output/error/state contract differs.");
        }
        return first;
    }

    public static void VerifyOriginal(SectionContract contract)
    {
        var all = JsonSerializer.Deserialize<SectionContract[]>(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "contract-oracles.json")))
            ?? throw new InvalidOperationException("Original section oracle corpus absent.");
        var expected = all.Single(row => row.Case == contract.Case);
        if (JsonSerializer.Serialize(expected) != JsonSerializer.Serialize(contract))
        {
            throw new InvalidOperationException("Complete section/output/caller-dictionary contract differs from original.");
        }
    }
}
