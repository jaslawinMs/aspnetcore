using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Razor.TagHelpers;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.AspNetCore.Razor.Runtime.TagHelpers;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace AutoPerf;

internal sealed record Spec(string Label, string Mode, int Length = 1024, string Kind = "General", bool Url = false, bool Encoded = false, int Attributes = 1);
internal static class Cases
{
    internal static readonly Spec[] All =
    [
        new("PreparedShort", "Prepared", 64),
        new("Prepared256", "Prepared", 256),
        new("Prepared1K", "Prepared"),
        new("Prepared2K", "Prepared", 2048),
        new("Prepared4K", "Prepared", 4096),
        new("PreparedOver4K", "Prepared", 4097),
        new("Prepared8K", "Prepared", 8192),
        new("PreparedEncoded1K", "Prepared", Encoded: true),
        new("PreparedUrl64", "Prepared", 64, Url: true),
        new("PreparedUrl1K", "Prepared", Url: true),
        new("PreparedTwoAttrs", "Prepared", Attributes: 2),
        new("RunnerShort", "Runner", 64),
        new("Runner1K", "Runner"),
        new("Runner8K", "Runner", 8192),
        new("RunnerUrl", "Runner", 64, Url: true),
        new("RunnerTwoAttrs", "Runner", Attributes: 2),
        new("PageBuffered1K", "Page"),
        new("StringControl1K", "Prepared", Kind: "String"),
        new("HtmlStringControl1K", "Prepared", Kind: "HtmlString"),
        new("NullTagControl", "Prepared", Kind: "NullTag"),
        new("UnknownTagControl", "Prepared", Kind: "UnknownTag"),
        new("NonContentBoolControl", "Prepared", Kind: "Bool"),
        new("Parallel1K", "Parallel"),
        new("ParallelFast", "Parallel", Kind: "String")
    ];
}

internal sealed class Producer(TagHelperAttribute[] attributes) : TagHelper
{
    public override int Order => -2000;
    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        foreach (var attribute in attributes)
        {
            output.Attributes.Add(attribute);
        }
    }
}

internal sealed class ProbePage : RazorPage
{
    public override Task ExecuteAsync() => Task.CompletedTask;
}

internal sealed class Workload : IDisposable
{
    internal static readonly string[] OwnerNames =
    [
        "Microsoft.AspNetCore.Mvc.Razor", "Microsoft.AspNetCore.Razor.Runtime", "Microsoft.AspNetCore.Razor",
        "Microsoft.AspNetCore.Html.Abstractions", "Microsoft.AspNetCore.Mvc.Core", "Microsoft.Extensions.ObjectPool"
    ];
    private readonly Spec _spec;
    private readonly TagHelperAttribute[] _attributes;
    private readonly UrlResolutionTagHelper _helper;
    private readonly TagHelperExecutionContext _execution;
    private readonly TagHelperOutput _output;
    private readonly TagHelperContext _context;
    private readonly Dictionary<object, object> _items = [];
    private readonly TagHelperRunner _runner = new();
    private readonly Producer _producer;
    private readonly ProbePage _page;
    private readonly string _tag;
    internal ParallelWork? Parallel { get; }
    internal object Input { get; }
    internal string Payload { get; }

    internal Workload(Spec spec, bool worker = false)
    {
        _spec = spec;
        var prefix = spec.Url ? "~/" : "/static/";
        var fill = spec.Encoded ? "a&<\u00E9" : "x";
        Payload = prefix + string.Concat(Enumerable.Repeat(fill, spec.Length)).Substring(0, spec.Length - prefix.Length);
        var content = new DefaultTagHelperContent();
        if (spec.Encoded)
        {
            content.Append(Payload);
        }
        else
        {
            content.AppendHtml(Payload);
        }
        object value = spec.Kind switch
        {
            "String" => Payload,
            "HtmlString" => new HtmlString(Payload),
            "Bool" => true,
            _ => content
        };
        _tag = spec.Attributes == 2 ? "object" : spec.Kind == "UnknownTag" ? "div" : "a";
        _attributes = Enumerable.Range(0, spec.Attributes).Select(index => new TagHelperAttribute(
            spec.Attributes == 2 ? (index == 0 ? "archive" : "data") : "href", value,
            index == 0 ? HtmlAttributeValueStyle.DoubleQuotes : HtmlAttributeValueStyle.SingleQuotes)).ToArray();
        var http = new DefaultHttpContext();
        http.Request.PathBase = "/app&root";
        var view = new ViewContext { HttpContext = http, RouteData = new(), ActionDescriptor = new(), Writer = TextWriter.Null };
        _helper = new UrlResolutionTagHelper(new UrlHelperFactory(), HtmlEncoder.Default) { ViewContext = view };
        _page = new ProbePage { ViewContext = view, HtmlEncoder = HtmlEncoder.Default };
        _execution = new TagHelperExecutionContext(_tag, TagMode.StartTagAndEndTag, _items, "F118",
            () => Task.CompletedTask, _ => throw new InvalidOperationException("No child-content callback expected."),
            () => throw new InvalidOperationException("No child-content callback expected."));
        _producer = new Producer(_attributes);
        _context = new TagHelperContext(_tag, new TagHelperAttributeList(_attributes), _items, "F118-prepared");
        _output = new TagHelperOutput(spec.Kind == "NullTag" ? null : _tag, new TagHelperAttributeList(_attributes),
            (_, _) => throw new InvalidOperationException("No child-content callback expected."));
        Input = new { spec.Label, spec.Mode, spec.Kind, spec.Length, spec.Url, spec.Encoded, spec.Attributes, payload = Payload,
            inputContentType = value.GetType().FullName, attributes = _attributes.Select(attribute =>
                new { attribute.Name, style = attribute.ValueStyle.ToString() }).ToArray(),
            pathBase = "/app&root", producerOrder = -2000, resolverOrder = _helper.Order,
            workers = spec.Mode == "Parallel" ? ParallelWork.Workers : 0,
            callsPerWorker = spec.Mode == "Parallel" ? ParallelWork.CallsPerWorker : 0 };
        if (spec.Mode == "Parallel" && !worker)
        {
            Parallel = new ParallelWork(spec);
        }
    }

    internal object Run()
    {
        if (Parallel is not null)
        {
            return Parallel.Run();
        }
        if (_spec.Mode == "Runner")
        {
            _execution.Reinitialize(_tag, TagMode.StartTagAndEndTag, _items, "F118", () => Task.CompletedTask);
            _execution.Add(_helper);
            _execution.Add(_producer);
            var task = _runner.RunAsync(_execution);
            Evidence.Require(task.IsCompletedSuccessfully, "The real synchronous runner path unexpectedly became pending.");

            return _execution.Output.Attributes[^1].Value;
        }
        if (_spec.Mode == "Page")
        {
            _execution.Reinitialize(_tag, TagMode.StartTagAndEndTag, _items, "F118-page", () => Task.CompletedTask);
            _page.BeginAddHtmlAttributeValues(_execution, "href", 1, HtmlAttributeValueStyle.DoubleQuotes);
            _page.AddHtmlAttributeValue("", 0, _attributes[0].Value, 0, Payload.Length, isLiteral: false);
            _page.EndAddHtmlAttributeValues(_execution);
            _helper.Process(_execution.Context, _execution.Output);

            return _execution.Output.Attributes[0].Value;
        }
        for (var index = 0; index < _attributes.Length; index++)
        {
            _output.Attributes[index] = _attributes[index];
        }
        _helper.Process(_context, _output);

        return _output.Attributes[^1].Value;
    }

    internal object Verify()
    {
        if (Parallel is not null)
        {
            return Parallel.Verify();
        }
        _ = Run();
        var output = _spec.Mode is "Runner" or "Page" ? _execution.Output : _output;
        var expectedValue = _spec.Kind == "Bool" ? "True" : _spec.Encoded ? HtmlEncoder.Default.Encode(Payload) : Payload;
        var active = _spec.Kind is not "NullTag" and not "UnknownTag" and not "Bool";
        if (active && _spec.Url)
        {
            expectedValue = "/app&amp;root/" + expectedValue[2..];
        }
        var type = _spec.Kind switch
        {
            "String" => typeof(string).FullName,
            "Bool" => typeof(bool).FullName,
            "NullTag" or "UnknownTag" => typeof(DefaultTagHelperContent).FullName,
            _ when _spec.Url => typeof(UrlResolutionTagHelper).FullName + "+EncodeFirstSegmentContent",
            _ => typeof(HtmlString).FullName
        };
        Evidence.Require(output.Attributes.Count == _attributes.Length, "Real output attribute count changed.");
        var actual = output.Attributes.Select((attribute, index) =>
        {
            using var writer = new StringWriter(CultureInfo.InvariantCulture);
            attribute.WriteTo(writer, HtmlEncoder.Default);
            var encoded = _spec.Kind == "String" ? HtmlEncoder.Default.Encode(Payload) : expectedValue;
            var quote = index == 0 ? "\"" : "'";
            var expected = attribute.Name + "=" + quote + encoded + quote;
            Evidence.Require(attribute.Value.GetType().FullName == type && attribute.Name == _attributes[index].Name &&
                attribute.ValueStyle == _attributes[index].ValueStyle && writer.ToString() == expected,
                "Actual typed/name/style/encoded attribute differs from independent expected:" + _spec.Label);

            return new { attribute.Name, valueType = attribute.Value.GetType().FullName, style = attribute.ValueStyle.ToString(), rendered = writer.ToString() };
        }).ToArray();
        Evidence.Require(output.TagName == (_spec.Kind == "NullTag" ? null : _tag), "Tag suppression/name changed.");

        return new { tagName = output.TagName, attributes = actual, normalRazorBufferedProducerBypassesGeneralWriter = _spec.Mode == "Page" };
    }

    internal long ValueChecksum()
    {
        var value = Run();

        return value is string text ? text.Length : value is HtmlString html ? html.Value!.Length : 1;
    }

    public void Dispose()
    {
        Parallel?.Dispose();
    }
}
