using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace AutoPerf;

internal sealed record NegotiationCase(string Name, string[] Supported, string? Requested,
    bool ExpectedCanWrite, string? ExpectedContentType, bool ServerDefined = false,
    bool Selector = false, string? Accept = null, string[]? Declared = null,
    bool UnsupportedType = false, bool Metadata = false);

internal static class NegotiationCases
{
    public static readonly NegotiationCase[] All = Create();

    private static NegotiationCase[] Create()
    {
        var cases = new List<NegotiationCase>();
        foreach (var count in new[] { 1, 8, 32 })
        {
            var plain = Plain(count);
            var longValues = Long(count);
            var parameters = Enumerable.Range(0, count).Select(i => $"application/json;v={i}").ToArray();
            cases.Add(new($"DirectExact{count}", plain, "application/json", true, "application/json"));
            cases.Add(new($"DirectLong{count}", longValues, longValues[0], true, longValues[0]));
            cases.Add(new($"DirectMiss{count}", plain, "text/html", false, "text/html"));
            cases.Add(new($"DirectMixed{count}", plain, "APPLICATION/JSON", true, "application/json"));
            cases.Add(new($"DirectParams{count}", parameters, parameters[0], true, parameters[0]));
        }
        foreach (var count in new[] { 8, 32 })
        {
            cases.Add(new($"DirectLast{count}", Plain(count, last: true), "application/json", true, "application/json"));
        }
        foreach (var count in new[] { 1, 32 })
        {
            var wildcards = Enumerable.Repeat("application/*+json", count).ToArray();
            cases.Add(new($"DirectServerSuffix{count}", wildcards, "application/vnd.example+json;v=2",
                true, "application/vnd.example+json;v=2", ServerDefined: true));
            cases.Add(new($"DirectClientSuffix{count}", wildcards, "application/vnd.example+json;v=2",
                false, "application/vnd.example+json;v=2"));
            cases.Add(new($"DirectNoContentControl{count}", Plain(count), null, true, "application/json"));
        }
        cases.Add(new("DirectUnsupportedControl", Plain(3), "application/json", false,
            "application/json", UnsupportedType: true));
        cases.Add(new("DirectWildcardRequest", Plain(3), "application/*", true, "application/json"));
        foreach (var count in new[] { 3, 32 })
        {
            cases.Add(new($"SelectorAcceptExact{count}", Plain(count), null, true, "application/json",
                Selector: true, Accept: "application/json"));
            cases.Add(new($"SelectorDeclared{count}", Plain(count), null, true, "application/json",
                Selector: true, Declared: ["application/json"]));
        }
        foreach (var count in new[] { 1, 32 })
        {
            var values = Long(count);
            cases.Add(new($"SelectorAcceptLong{count}", values, null, true, values[0],
                Selector: true, Accept: values[0]));
        }
        cases.Add(new("SelectorAcceptLast32", Plain(32, last: true), null, true, "application/json",
            Selector: true, Accept: "application/json"));
        cases.Add(new("SelectorAcceptMiss32", Plain(32), null, false, "text/html",
            Selector: true, Accept: "text/html"));
        cases.Add(new("SelectorQuality3", Plain(3), null, true, "application/json",
            Selector: true, Accept: "text/html;q=0.3, application/json;q=0.9"));
        cases.Add(new("SelectorBrowserControl3", Plain(3), null, true, "application/json",
            Selector: true, Accept: "*/*"));
        cases.Add(new("SelectorDeclaredSuffix3", ["application/*+json", "application/xml", "text/plain"],
            null, true, "application/vnd.example+json", Selector: true, Declared: ["application/vnd.example+json"]));
        cases.Add(new("SelectorParams3", ["application/json;v=1", "application/xml;v=1", "text/plain;v=1"],
            null, true, "application/json;v=1", Selector: true, Declared: ["application/json;v=1"]));
        cases.Add(new("SelectorUnsupportedControl3", Plain(3), null, false, "application/json",
            Selector: true, Accept: "application/json", UnsupportedType: true));
        cases.Add(new("SelectorNoAcceptControl3", Plain(3), null, true, "application/json", Selector: true));
        cases.Add(new("MetadataUnchangedControl3", Plain(3), null, true, null, Metadata: true));
        if (cases.Count != 40 || cases.Select(profile => profile.Name).Distinct().Count() != 40)
        {
            throw new InvalidOperationException("Expected forty distinct fixed profiles.");
        }
        return cases.ToArray();
    }

    private static string[] Plain(int count, bool last = false)
    {
        return Enumerable.Range(0, count).Select(i =>
            i == (last ? count - 1 : 0) ? "application/json" : $"application/x-autoperf{i}").ToArray();
    }

    private static string[] Long(int count)
    {
        return Enumerable.Range(0, count).Select(i => "application/x-" + new string('a', 128) + i).ToArray();
    }
}

internal sealed class NegotiationFixture : IDisposable
{
    private readonly NegotiationCase _case;
    private readonly BenchmarkFormatter _formatter;
    private readonly OutputFormatterWriteContext _context;
    private readonly StringSegment _requested;
    private readonly MediaTypeCollection _declared = new();
    private readonly DefaultOutputFormatterSelector? _selector;

    public NegotiationFixture(NegotiationCase profile)
    {
        _case = profile;
        _formatter = new BenchmarkFormatter();
        foreach (var value in profile.Supported)
        {
            _formatter.SupportedMediaTypes.Add(new string(value.AsSpan()));
        }
        _context = CreateContext(profile.UnsupportedType ? typeof(string) : typeof(object));
        _requested = profile.Requested is { } requested
            ? new StringSegment("prefix" + requested, 6, requested.Length) : default;
        if (profile.Selector)
        {
            _context.HttpContext.Request.Headers.Accept = profile.Accept is { } accept ? new string(accept.AsSpan()) : null;
            foreach (var value in profile.Declared ?? [])
            {
                _declared.Add(new string(value.AsSpan()));
            }
            _selector = CreateSelector(_formatter);
        }
    }

    public int Exercise()
    {
        if (_case.Metadata)
        {
            return _formatter.GetSupportedContentTypes(contentType: null, typeof(object))?.Count ?? -1;
        }
        _context.ContentType = _requested;
        _context.ContentTypeIsServerDefined = _case.ServerDefined;
        if (_case.Selector)
        {
            return _selector!.SelectFormatter(_context, Array.Empty<IOutputFormatter>(), _declared) is null ? 0 : 1;
        }
        return _formatter.CanWriteResult(_context) ? 1 : 0;
    }

    public object Validate()
    {
        var calls = _formatter.TypeChecks;
        var result = Exercise();
        if (_formatter.TypeChecks <= calls)
        {
            throw new InvalidOperationException($"Actual formatter owner was not reached: {_case.Name}.");
        }
        if (_case.Metadata)
        {
            var values = _formatter.GetSupportedContentTypes(contentType: null, typeof(object));
            if (result != 3 || values is null || !values.SequenceEqual(_case.Supported, StringComparer.Ordinal))
            {
                throw new InvalidOperationException("Untouched metadata control changed.");
            }
            return new { metadata = values.ToArray(), owner_reached = true };
        }
        if (result != (_case.ExpectedCanWrite ? 1 : 0) || _context.ContentType.Value != _case.ExpectedContentType ||
            _context.ContentTypeIsServerDefined != (_case.Selector ? _declared.Count > 0 : _case.ServerDefined))
        {
            throw new InvalidOperationException($"Actual negotiation decision changed: {_case.Name}.");
        }
        if (!_case.Selector && _requested.HasValue && _formatter.SupportedMediaTypes.Any(value =>
            string.Equals(value, _requested.Value, StringComparison.Ordinal) && ReferenceEquals(value, _requested.Buffer)))
        {
            throw new InvalidOperationException("Requested/supported equal strings must not alias.");
        }
        return new
        {
            result,
            selected_content_type = _context.ContentType.Value,
            selected_offset = _context.ContentType.Offset,
            server_defined = _context.ContentTypeIsServerDefined,
            configured = _formatter.SupportedMediaTypes.ToArray(),
            raw_accept = _context.HttpContext.Request.Headers.Accept.ToArray(),
            declared = _declared.ToArray(),
            owner_calls = _formatter.TypeChecks - calls,
        };
    }

    public static object[] ValidateRawProducers()
    {
        string[] values = ["", "application/json; x=", "application/json", "APPLICATION/JSON",
            " application / json ", "application", "/json", " ", "*/*", "application/*+json",
            "text/plain;*", "application/json; x=\"a;b\"", "application/json;v=1;v=2"];
        return values.SelectMany(value => new[] { false, true }.Select(serverDefined =>
        {
            var formatter = new BenchmarkFormatter();
            formatter.SupportedMediaTypes.Add(value);
            var context = CreateContext(typeof(object));
            context.ContentType = new StringSegment(value);
            context.ContentTypeIsServerDefined = serverDefined;
            bool? result = null;
            string? error = null;
            try
            {
                result = formatter.CanWriteResult(context);
            }
            catch (ArgumentOutOfRangeException exception)
            {
                error = $"{exception.GetType().Name}({exception.ParamName})";
            }
            return (object)new { raw = value, server_defined = serverDefined, result,
                selected = context.ContentType.Value, actual_error = error,
                producer = "public mutable SupportedMediaTypes/context and actual CanWriteResult" };
        })).ToArray();
    }

    public static object[] ValidateSelectorProducers()
    {
        return new[] { "application/json", "text/html, application/json", "" }.Select(header =>
        {
            var formatter = new CapturingFormatter();
            formatter.SupportedMediaTypes.Add(new string("application/json".AsSpan()));
            var context = CreateContext(typeof(object));
            context.HttpContext.Request.Headers.Accept = new string(header.AsSpan());
            var declared = new MediaTypeCollection();
            if (header.Length == 0)
            {
                declared.Add(new string("application/json".AsSpan()));
            }
            var selected = CreateSelector(formatter).SelectFormatter(context, Array.Empty<IOutputFormatter>(), declared);
            if (!ReferenceEquals(selected, formatter) || context.ContentType.Value != "application/json" ||
                formatter.Inputs.Count != (header.StartsWith("text/html", StringComparison.Ordinal) ? 2 : 1) ||
                formatter.Inputs[^1].Requested != "application/json" ||
                formatter.Inputs[^1].ServerDefined != (header.Length == 0) ||
                formatter.Inputs[^1].Offset != (header.Length == 0 ? 0 : header.IndexOf("application/json", StringComparison.Ordinal)))
            {
                throw new InvalidOperationException("Actual Accept/declared producer did not reach the expected owner input.");
            }
            return (object)new { raw_accept = header, inputs = formatter.Inputs.ToArray(),
                selected = context.ContentType.Value, producer = "actual DefaultOutputFormatterSelector/AcceptHeaderParser" };
        }).ToArray();
    }

    public static object[] ValidateMutation()
    {
        var formatter = new BenchmarkFormatter();
        formatter.SupportedMediaTypes.Add("application/json");
        var context = CreateContext(typeof(object));
        context.ContentType = new StringSegment("application/json");
        if (!formatter.CanWriteResult(context))
        {
            throw new InvalidOperationException("Initial live first match failed.");
        }
        var original = context.ContentType;
        formatter.SupportedMediaTypes[0] = "application/xml";
        formatter.SupportedMediaTypes.Add(new string("application/json".AsSpan()));
        context.ContentType = new StringSegment("application/json");
        if (!formatter.CanWriteResult(context) || !ReferenceEquals(context.ContentType.Buffer, formatter.SupportedMediaTypes[1]))
        {
            throw new InvalidOperationException("Updated live later match failed.");
        }
        formatter.SupportedMediaTypes.RemoveAt(1);
        context.ContentType = new StringSegment("application/json");
        if (formatter.CanWriteResult(context) || original.Value != "application/json")
        {
            throw new InvalidOperationException("Removal or earlier selection snapshot changed.");
        }
        return [new { original = original.Value, after_removal = context.ContentType.Value,
            selected_after_removal = false, remaining = formatter.SupportedMediaTypes.ToArray() }];
    }

    public static object[] ValidateTypeCheckProducers()
    {
        return new[] { "application/json", "" }.Select(value =>
        {
            var formatter = new ClearingFormatter();
            formatter.SupportedMediaTypes.Add("application/json");
            var context = CreateContext(typeof(object));
            context.ContentType = new StringSegment(value);
            bool? result = null;
            string? error = null;
            try
            {
                result = formatter.CanWriteResult(context);
            }
            catch (ArgumentOutOfRangeException exception)
            {
                error = $"{exception.GetType().Name}({exception.ParamName})";
            }
            if (formatter.SupportedMediaTypes.Count != 0 || formatter.TypeChecks != 1 ||
                (value.Length == 0 ? error != "ArgumentOutOfRangeException(offset)" : result != false || error is not null))
            {
                throw new InvalidOperationException("Actual virtual type-check collection mutation/order changed.");
            }
            return (object)new { requested = value, result, actual_error = error, type_checks = formatter.TypeChecks,
                supported_after = formatter.SupportedMediaTypes.Count, producer = "actual virtual CanWriteType clears public configuration" };
        }).ToArray();
    }

    public static object[] ValidateSegmentBoundaries()
    {
        return new[] { "suffix", ", text/html" }.Select(suffix =>
        {
            var formatter = new BenchmarkFormatter();
            formatter.SupportedMediaTypes.Add("application/json");
            var context = CreateContext(typeof(object));
            context.ContentType = new StringSegment("prefixapplication/json" + suffix, 6, 16);
            var segmentEqual = context.ContentType.Equals("application/json", StringComparison.Ordinal);
            var result = formatter.CanWriteResult(context);
            if (!segmentEqual || result != suffix.StartsWith(",", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Actual public segment token-boundary behavior changed.");
            }
            return (object)new { suffix, segment_equal_before_owner = segmentEqual, result,
                selected = context.ContentType.Value, producer = "actual public StringSegment and CanWriteResult token lexer" };
        }).ToArray();
    }

    private static OutputFormatterWriteContext CreateContext(Type type)
    {
        return new OutputFormatterWriteContext(new DefaultHttpContext(),
            (stream, encoding) => new StreamWriter(stream, encoding), type, new object());
    }

    private static DefaultOutputFormatterSelector CreateSelector(BenchmarkFormatter formatter)
    {
        var options = new MvcOptions { ReturnHttpNotAcceptable = true, RespectBrowserAcceptHeader = false };
        options.OutputFormatters.Clear();
        options.OutputFormatters.Add(formatter);
        return new DefaultOutputFormatterSelector(Options.Create(options), NullLoggerFactory.Instance);
    }

    public void Dispose()
    {
    }
}

internal class BenchmarkFormatter : OutputFormatter
{
    public int TypeChecks { get; private set; }

    protected override bool CanWriteType(Type? type)
    {
        TypeChecks++;
        return type != typeof(string);
    }

    public override Task WriteResponseBodyAsync(OutputFormatterWriteContext context)
    {
        throw new NotSupportedException("Body writing is outside this selection benchmark.");
    }
}

internal sealed class ClearingFormatter : BenchmarkFormatter
{
    protected override bool CanWriteType(Type? type)
    {
        var result = base.CanWriteType(type);
        SupportedMediaTypes.Clear();
        return result;
    }
}

internal sealed class CapturingFormatter : BenchmarkFormatter
{
    public List<OwnerInput> Inputs { get; } = new();

    public override bool CanWriteResult(OutputFormatterCanWriteContext context)
    {
        Inputs.Add(new OwnerInput(context.ContentType.Value, context.ContentType.Offset, context.ContentTypeIsServerDefined));
        return base.CanWriteResult(context);
    }
}

internal sealed record OwnerInput(string? Requested, int Offset, bool ServerDefined);
