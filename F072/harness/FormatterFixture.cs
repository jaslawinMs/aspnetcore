using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Primitives;

namespace AutoPerf;

internal sealed record FormatterCase(string Name, string[] Supported, string? Requested = null,
    string[]? Expected = null, bool UnsupportedType = false, bool Metadata = false,
    bool CachedMetadata = false, bool CanWrite = false);

internal static class FormatterCases
{
    public static readonly FormatterCase[] All = Create();

    private static FormatterCase[] Create()
    {
        var profiles = new List<FormatterCase>();
        foreach (var count in new[] { 1, 3, 8, 32 })
        {
            var values = Plain(count);
            profiles.Add(new($"NullPlain{count}", values, Expected: values));
        }
        foreach (var count in new[] { 1, 32 })
        {
            var values = Enumerable.Range(0, count).Select(i => "application/x-" + new string('a', 128) + i).ToArray();
            profiles.Add(new($"NullLong{count}", values, Expected: values));
            var parameters = Enumerable.Range(0, count).Select(i => $"application/json;v={i}").ToArray();
            profiles.Add(new($"NullParams{count}", parameters, Expected: parameters));
            var wildcards = Enumerable.Repeat("application/*+json", count).ToArray();
            profiles.Add(new($"NullWildcards{count}", wildcards));
            profiles.Add(new($"Exact{count}", Plain(count), "application/json", ["application/json"]));
            profiles.Add(new($"AllApplication{count}", Plain(count), "application/*", Plain(count)));
            profiles.Add(new($"Suffix{count}", wildcards, "application/vnd.example+json;v=2",
                Enumerable.Repeat("application/vnd.example+json;v=2", count).ToArray()));
            profiles.Add(new($"Miss{count}", Plain(count), "text/html"));
            profiles.Add(new($"ExactParams{count}", parameters, "application/json;v=0", [parameters[0]]));
        }
        foreach (var count in new[] { 3, 32 })
        {
            var values = Mixed(count);
            profiles.Add(new($"NullMixed{count}", values,
                Expected: values.Where(value => !value.Contains('*')).ToArray()));
        }
        profiles.Add(new("UnsupportedType", Plain(3), UnsupportedType: true));
        profiles.Add(new("MetadataPlain3", Plain(3), Metadata: true));
        profiles.Add(new("MetadataPlain32", Plain(32), Metadata: true));
        profiles.Add(new("MetadataMixed3", Mixed(3), Metadata: true));
        profiles.Add(new("MetadataParams3", ["application/json;v=0", "application/json;v=1", "application/json;v=2"], Metadata: true));
        profiles.Add(new("MetadataCachedControl", Plain(3), Metadata: true, CachedMetadata: true));
        profiles.Add(new("CanWriteNoContentControl", Plain(3), CanWrite: true));
        profiles.Add(new("CanWriteExactControl", Plain(3), "application/json", CanWrite: true));
        if (profiles.Count != 30)
        {
            throw new InvalidOperationException("Expected thirty fixed profiles.");
        }
        return profiles.ToArray();
    }

    private static string[] Plain(int count)
    {
        return Enumerable.Range(0, count).Select(i => i == 0 ? "application/json" : $"application/x-autoperf{i}").ToArray();
    }

    private static string[] Mixed(int count)
    {
        return Enumerable.Range(0, count).Select(i => i % 3 == 2 ? "application/*+json"
            : i == 0 ? "application/json" : $"application/x-autoperf{i}").ToArray();
    }
}

internal sealed class FormatterFixture : IDisposable
{
    private readonly FormatterCase _case;
    private readonly BenchmarkFormatter _formatter;
    private readonly string? _requested;
    private readonly ServiceProvider? _services;
    private readonly IActionDescriptorCollectionProvider? _actions;
    private readonly IApiDescriptionProvider[]? _providers;
    private readonly ApiDescriptionGroupCollectionProvider? _cached;
    private readonly OutputFormatterWriteContext? _writeContext;

    public FormatterFixture(FormatterCase profile)
    {
        _case = profile;
        _formatter = new BenchmarkFormatter();
        foreach (var value in profile.Supported)
        {
            _formatter.SupportedMediaTypes.Add(new string(value.AsSpan()));
        }
        _requested = profile.Requested is { } requested ? new string(requested.AsSpan()) : null;
        if (_requested is not null && _formatter.SupportedMediaTypes.Any(value =>
            string.Equals(value, _requested, StringComparison.Ordinal) && ReferenceEquals(value, _requested)))
        {
            throw new InvalidOperationException("Equal requested/supported strings must not alias.");
        }
        if (profile.Metadata)
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddSingleton(new DiagnosticListener("AutoPerf"));
            services.AddSingleton<DiagnosticSource>(provider => provider.GetRequiredService<DiagnosticListener>());
            services.AddMvcCore(options =>
            {
                options.OutputFormatters.Clear();
                options.OutputFormatters.Add(_formatter);
            }).AddApiExplorer().ConfigureApplicationPartManager(manager =>
            {
                manager.ApplicationParts.Clear();
                manager.ApplicationParts.Add(new AssemblyPart(typeof(MetadataFixtureController).Assembly));
            });
            _services = services.BuildServiceProvider();
            _actions = _services.GetRequiredService<IActionDescriptorCollectionProvider>();
            _providers = _services.GetServices<IApiDescriptionProvider>().ToArray();
            if (_actions.ActionDescriptors.Items.Count != 4 ||
                !_providers.Any(provider => provider is DefaultApiDescriptionProvider))
            {
                throw new InvalidOperationException("Actual controller discovery/ApiExplorer production did not run.");
            }
            _cached = new ApiDescriptionGroupCollectionProvider(_actions, _providers);
            _ = _cached.ApiDescriptionGroups;
        }
        if (profile.CanWrite)
        {
            _writeContext = new OutputFormatterWriteContext(new DefaultHttpContext(),
                (stream, encoding) => new StreamWriter(stream, encoding), typeof(object), new object());
        }
    }

    public int Exercise()
    {
        if (_case.Metadata)
        {
            var provider = _case.CachedMetadata ? _cached!
                : new ApiDescriptionGroupCollectionProvider(_actions!, _providers!);
            return CountFormats(provider.ApiDescriptionGroups);
        }
        if (_case.CanWrite)
        {
            _writeContext!.ContentType = new StringSegment(_requested);
            return _formatter.CanWriteResult(_writeContext) ? 1 : 0;
        }
        return _formatter.GetSupportedContentTypes(_requested,
            _case.UnsupportedType ? typeof(string) : typeof(object))?.Count ?? -1;
    }

    public object Validate()
    {
        if (_case.Metadata)
        {
            var calls = _formatter.TypeChecks;
            var provider = _case.CachedMetadata ? _cached!
                : new ApiDescriptionGroupCollectionProvider(_actions!, _providers!);
            var groups = provider.ApiDescriptionGroups;
            if (_case.CachedMetadata ? _formatter.TypeChecks != calls : _formatter.TypeChecks <= calls)
            {
                throw new InvalidOperationException("Cached/un-cached owner reachability changed.");
            }
            var descriptions = groups.Items.SelectMany(group => group.Items).OrderBy(item => item.RelativePath).ToArray();
            if (descriptions.Length != 4)
            {
                throw new InvalidOperationException("Actual controller API descriptions missing.");
            }
            var expected = _case.Supported.Where(value => !value.Contains('*')).ToArray();
            foreach (var description in descriptions)
            {
                var response = description.SupportedResponseTypes.Single();
                var formats = response.ApiResponseFormats.Select(format => format.MediaType).ToArray();
                var target = description.RelativePath!.EndsWith("empty", StringComparison.Ordinal) ? Array.Empty<string>()
                    : description.RelativePath.EndsWith("declared", StringComparison.Ordinal) ? ["application/x-declared"] : expected;
                if (response.StatusCode != 200 || !formats.SequenceEqual(target, StringComparer.Ordinal))
                {
                    throw new InvalidOperationException($"Actual response-format metadata changed: {description.RelativePath}.");
                }
            }
            return new
            {
                actual_controller_actions = _actions!.ActionDescriptors.Items.Count,
                owner_reached = !_case.CachedMetadata,
                descriptions = descriptions.Select(description => new
                {
                    description.RelativePath,
                    description.HttpMethod,
                    responses = description.SupportedResponseTypes.Select(response => new
                    {
                        response.StatusCode,
                        type = response.Type?.FullName,
                        formats = response.ApiResponseFormats.Select(format => new
                        {
                            format.MediaType,
                            formatter = format.Formatter?.GetType().Name
                        }).ToArray()
                    }).ToArray()
                }).ToArray()
            };
        }
        if (_case.CanWrite)
        {
            if (Exercise() != 1 || _writeContext!.ContentType.Value != _case.Supported[0])
            {
                throw new InvalidOperationException("Untouched CanWriteResult control changed.");
            }
            return new { can_write = true, selected = _writeContext.ContentType.Value };
        }
        var result = _formatter.GetSupportedContentTypes(_requested,
            _case.UnsupportedType ? typeof(string) : typeof(object));
        if (_case.Expected is null ? result is not null
            : result is null || !result.SequenceEqual(_case.Expected, StringComparer.Ordinal))
        {
            throw new InvalidOperationException($"Actual supported content types changed: {_case.Name}.");
        }
        return new { requested = _requested, supported = _formatter.SupportedMediaTypes.ToArray(),
            selected = result?.ToArray(), equal_reference_aliases = 0 };
    }

    public static object[] ValidateRawProducers()
    {
        string[] values = ["", "application/json; x=", "application/json", "APPLICATION/JSON",
            " application / json ", "application", "/json", " ", "*/*", "application/*+json",
            "text/plain;*", "application/json; x=\"a;b\"", "application/json;v=1;v=2"];
        return values.Select(value =>
        {
            var formatter = new BenchmarkFormatter();
            formatter.SupportedMediaTypes.Add(value);
            string[]? result = null;
            string? error = null;
            try
            {
                result = formatter.GetSupportedContentTypes(contentType: null, typeof(object))?.ToArray();
            }
            catch (ArgumentOutOfRangeException exception)
            {
                error = $"{exception.GetType().Name}({exception.ParamName})";
            }
            return (object)new { raw = value, selected = result, actual_error = error,
                producer = "public mutable SupportedMediaTypes and actual OutputFormatter" };
        }).ToArray();
    }

    public static object[] ValidateMutation()
    {
        var formatter = new BenchmarkFormatter();
        formatter.SupportedMediaTypes.Add("application/json");
        var original = formatter.GetSupportedContentTypes(contentType: null, typeof(object));
        formatter.SupportedMediaTypes[0] = "application/xml";
        formatter.SupportedMediaTypes.Add("text/plain");
        var changed = formatter.GetSupportedContentTypes(contentType: null, typeof(object));
        if (original is null || !original.SequenceEqual(["application/json"]) ||
            changed is null || !changed.SequenceEqual(["application/xml", "text/plain"]))
        {
            throw new InvalidOperationException("Live mutable configuration or result snapshot changed.");
        }
        formatter.SupportedMediaTypes.RemoveAt(0);
        var removed = formatter.GetSupportedContentTypes(contentType: null, typeof(object));
        if (removed is null || !removed.SequenceEqual(["text/plain"]))
        {
            throw new InvalidOperationException("Removed supported media type was cached.");
        }
        return [new { original = original.ToArray(), changed = changed.ToArray(), removed = removed.ToArray() }];
    }

    private static int CountFormats(ApiDescriptionGroupCollection groups)
    {
        var count = 0;
        foreach (var group in groups.Items)
        {
            foreach (var description in group.Items)
            {
                foreach (var response in description.SupportedResponseTypes)
                {
                    count += response.ApiResponseFormats.Count;
                }
            }
        }
        return count;
    }

    public void Dispose()
    {
        _services?.Dispose();
    }
}

internal sealed class BenchmarkFormatter : OutputFormatter
{
    public int TypeChecks { get; private set; }

    protected override bool CanWriteType(Type? type)
    {
        TypeChecks++;
        return type != typeof(string);
    }

    public override Task WriteResponseBodyAsync(OutputFormatterWriteContext context)
    {
        throw new NotSupportedException("Body writing is outside metadata discovery.");
    }
}

[Route("autoperf/metadata")]
[ApiExplorerSettings(IgnoreApi = false)]
public sealed class MetadataFixtureController : ControllerBase
{
    [HttpGet("implicit")]
    public MetadataPayload Implicit()
    {
        return new MetadataPayload();
    }

    [HttpGet("typed")]
    [ProducesResponseType(typeof(MetadataPayload), 200)]
    public ActionResult<MetadataPayload> Typed()
    {
        return new MetadataPayload();
    }

    [HttpGet("declared")]
    [Produces("application/x-declared")]
    public MetadataPayload Declared()
    {
        return new MetadataPayload();
    }

    [HttpGet("empty")]
    public void Empty()
    {
    }
}

public sealed class MetadataPayload
{
    public int Id { get; set; }
}
