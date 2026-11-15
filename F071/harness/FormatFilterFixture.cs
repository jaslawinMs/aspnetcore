using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AutoPerf;

internal sealed record FilterCase(string Name, string ContentType, string[] Supported, bool NotFound,
    bool Query = false, string? Format = "mapped", bool NoProviders = false);

internal static class FilterCases
{
    public static readonly FilterCase[] All = Create();

    private static FilterCase[] Create()
    {
        const string json = "application/json";
        const string vendor = "application/vnd.autoperf.example+json";
        const string parameters = "application/json; version=1; charset=utf-8";
        var longType = "application/x-" + new string('a', 128);
        return
        [
            Match("ExactJson1", json, json, 1, 0),
            Match("ExactJson8", json, json, 8, 0),
            Match("ExactJson32", json, json, 32, 0),
            Match("LastJson8", json, json, 8, 7),
            Match("LastJson32", json, json, 32, 31),
            Miss("MissJson1", json, 1),
            Miss("MissJson8", json, 8),
            Miss("MissJson32", json, 32),
            Match("MixedJson1", json, "APPLICATION/JSON", 1, 0),
            Match("MixedJson32", json, "APPLICATION/JSON", 32, 0),
            Match("ExactVendor1", vendor, vendor, 1, 0),
            Match("ExactVendor32", vendor, vendor, 32, 0),
            Match("ExactLong1", longType, longType, 1, 0),
            Match("ExactParams1", parameters, parameters, 1, 0),
            Match("ExactParams8", parameters, parameters, 8, 0),
            Match("ExactParams32", parameters, parameters, 32, 0),
            Match("LastParams32", parameters, parameters, 32, 31),
            new("ParamMiss1", "application/json; version=1", ["application/json; version=2"], true),
            new("ParamMiss32", "application/json; version=1",
                Enumerable.Repeat("application/json; version=2", 32).ToArray(), true),
            Match("MoreSpecific1", json, "application/json; version=1", 1, 0),
            Match("MoreSpecific32", json, "application/json; version=1", 32, 0),
            Match("Suffix1", json, vendor, 1, 0),
            Match("Suffix32", json, vendor, 32, 0),
            Match("QueryExact1", json, json, 1, 0) with { Query = true },
            Match("QueryExact32", json, json, 32, 0) with { Query = true },
            Miss("QueryMiss32", json, 32) with { Query = true },
            new("NoDeclaredTypes", json, [], false),
            Match("NoFormat", json, json, 1, 0) with { Format = null },
            new("UnknownFormat", json, [json], true, Format: "unknown"),
            new("NoProviders", json, [], false, NoProviders: true)
        ];
    }

    private static FilterCase Match(string name, string requested, string supported, int count, int position)
    {
        var values = Enumerable.Range(0, count).Select(i => $"application/x-autoperf{i}").ToArray();
        values[position] = supported;
        return new(name, requested, values, false);
    }

    private static FilterCase Miss(string name, string requested, int count)
    {
        return new(name, requested,
            Enumerable.Range(0, count).Select(i => $"application/x-autoperf{i}").ToArray(), true);
    }
}

internal sealed class FormatFilterFixture
{
    private readonly FilterCase _case;
    private readonly MvcOptions _options;
    private readonly FormatFilter _filter;
    private readonly ResourceExecutingContext _resource;
    private readonly ProducesAttribute _produces;
    private readonly bool[] _rawEquals;

    public FormatFilterFixture(FilterCase @case)
    {
        _case = @case;
        _options = new MvcOptions();
        _options.FormatterMappings.SetMediaTypeMappingForFormat("mapped", new string(@case.ContentType.AsSpan()));
        _filter = new FormatFilter(Options.Create(_options), NullLoggerFactory.Instance);
        _produces = @case.Supported.Length == 0
            ? new ProducesAttribute(typeof(object))
            : new ProducesAttribute(new string(@case.Supported[0].AsSpan()),
                @case.Supported.Skip(1).Select(value => new string(value.AsSpan())).ToArray());
        IFilterMetadata[] filters = @case.NoProviders ? [_filter] : [_filter, _produces];
        _resource = CreateContext(@case.Format, @case.Query, filters);

        var mapped = _options.FormatterMappings.GetMediaTypeMappingForFormat("mapped")
            ?? throw new InvalidOperationException("Actual formatter mapping missing.");
        _rawEquals = _produces.ContentTypes.Select(value => string.Equals(mapped, value, StringComparison.Ordinal)).ToArray();
        if (_rawEquals.Select((equal, i) => equal && ReferenceEquals(mapped, _produces.ContentTypes[i])).Any(alias => alias))
        {
            throw new InvalidOperationException($"Same-reference strings invalidate the independently allocated scenario: {@case.Name}.");
        }
        if ((@case.Name.StartsWith("Exact", StringComparison.Ordinal) || @case.Name.StartsWith("QueryExact", StringComparison.Ordinal))
            && (_rawEquals.Length == 0 || !_rawEquals[0]))
        {
            throw new InvalidOperationException($"The intended first raw-equality producer did not run: {@case.Name}.");
        }
    }

    public int Exercise()
    {
        _resource.Result = null;
        _filter.OnResourceExecuting(_resource);
        return _resource.Result is NotFoundResult ? 404 : 200;
    }

    public object Validate()
    {
        var result = Exercise();
        if (result != (_case.NotFound ? 404 : 200))
        {
            throw new InvalidOperationException($"Resource-filter result changed for {_case.Name}: {result}.");
        }
        var selected = Array.Empty<string>();
        if (result == 200)
        {
            var objectResult = new ObjectResult("autoperf");
            var resultContext = new ResultExecutingContext(_resource, _resource.Filters, objectResult, new object());
            _filter.OnResultExecuting(resultContext);
            selected = objectResult.ContentTypes.ToArray();
            string[] expected = _case.Format is null ? [] :
                [_options.FormatterMappings.GetMediaTypeMappingForFormat("mapped")
                    ?? throw new InvalidOperationException("Actual formatter mapping missing.")];
            if (!selected.SequenceEqual(expected, StringComparer.Ordinal))
            {
                throw new InvalidOperationException($"Actual result content types changed for {_case.Name}.");
            }
        }
        return new
        {
            resource_status_marker = result,
            selected_content_types = selected,
            actual_format = _filter.GetFormat(_resource),
            supported_content_types = _produces.ContentTypes.ToArray(),
            raw_requested_supported_ordinal_equal = _rawEquals,
            identical_reference_aliases = 0
        };
    }

    public static object[] ValidateMetadataUpdates()
    {
        var records = new List<object>();
        var options = new MvcOptions();
        options.FormatterMappings.SetMediaTypeMappingForFormat("mapped", "application/json");
        var filter = new FormatFilter(Options.Create(options), NullLoggerFactory.Instance);
        var first = new ChangingMetadata("first", "application/xml");
        var second = new ChangingMetadata("second", "application/json");
        var context = CreateContext("mapped", query: true, [filter, first, second]);
        var order = new List<string>();
        first.Order = second.Order = order;

        foreach (var (name, contentType, expected) in new[]
        {
            ("SecondProviderOverridesFirst", "application/json", 200),
            ("SameMetadataInstanceChanges", "application/xml", 404),
            ("SameMetadataInstanceReturns", "application/json", 200)
        })
        {
            second.ContentType = contentType;
            context.Result = null;
            order.Clear();
            filter.OnResourceExecuting(context);
            var actual = context.Result is NotFoundResult ? 404 : 200;
            if (actual != expected || !order.SequenceEqual(["first", "second"]))
            {
                throw new InvalidOperationException($"Live metadata production/order changed: {name}.");
            }
            records.Add(new { name, actual, provider_order = order.ToArray() });
        }
        second.ContentType = "application/xml";
        options.FormatterMappings.SetMediaTypeMappingForFormat("mapped", "application/xml");
        context.Result = null;
        order.Clear();
        filter.OnResourceExecuting(context);
        if (context.Result is not null || first.Calls != 4 || second.Calls != 4)
        {
            throw new InvalidOperationException("A new mapping or all per-request metadata invocations were lost.");
        }
        var objectResult = new ObjectResult("autoperf");
        filter.OnResultExecuting(new ResultExecutingContext(context, context.Filters, objectResult, new object()));
        if (!objectResult.ContentTypes.SequenceEqual(["application/xml"], StringComparer.Ordinal))
        {
            throw new InvalidOperationException("Updated mapping did not reach the result.");
        }
        records.Add(new { name = "UpdatedMapping", selected = objectResult.ContentTypes.ToArray(), calls_per_provider = 4 });
        return records.ToArray();
    }

    private static ResourceExecutingContext CreateContext(string? format, bool query, IFilterMetadata[] filters)
    {
        var http = new DefaultHttpContext();
        var route = new RouteData();
        if (format is not null)
        {
            if (query)
            {
                http.Request.QueryString = new QueryString("?format=" + Uri.EscapeDataString(format));
            }
            else
            {
                route.Values["format"] = format;
            }
        }
        return new ResourceExecutingContext(
            new ActionContext(http, route, new ActionDescriptor()), filters, new List<IValueProviderFactory>());
    }

    private sealed class ChangingMetadata(string name, string contentType) : IApiResponseMetadataProvider
    {
        public Type? Type => typeof(object);
        public int StatusCode => 200;
        public string ContentType { get; set; } = contentType;
        public List<string> Order { get; set; } = [];
        public int Calls { get; private set; }

        public void SetContentTypes(MediaTypeCollection contentTypes)
        {
            Calls++;
            Order.Add(name);
            contentTypes.Clear();
            contentTypes.Add(ContentType);
        }
    }
}
