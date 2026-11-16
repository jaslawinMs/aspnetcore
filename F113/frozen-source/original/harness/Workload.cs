using System.Reflection;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.TagHelpers;
using Microsoft.AspNetCore.Mvc.TagHelpers.Cache;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

internal sealed class Workload : IDisposable
{
    private readonly Spec _spec;
    private readonly ServiceProvider _services;
    private readonly IDistributedCache _cache;
    private readonly IDistributedCacheTagHelperService _service;
    private readonly IDistributedCacheTagHelperFormatter _formatter;
    private readonly IDistributedCacheTagHelperStorage _storage;
    private readonly Func<byte[], byte[], byte[]> _encode;
    private readonly DistributedCacheTagHelper _helper;
    private readonly TagHelperContext _context = new("distributed-cache", new(), new Dictionary<object, object>(), "F113");
    private readonly DistributedCacheEntryOptions _options = new() { SlidingExpiration = TimeSpan.FromMinutes(30) };
    private readonly byte[] _keyBytes;
    private readonly byte[] _payload;
    private readonly byte[] _envelope;
    private readonly string _hashedKey;
    private readonly string _rendered;
    private readonly TagHelperContent _child;
    private readonly Task<TagHelperContent> _childTask;
    private readonly DistributedCacheTagHelperFormattingContext _formatContext;
    private readonly Func<bool, HtmlEncoder, Task<TagHelperContent>> _childCallback;
    private TagHelperOutput? _lastOutput;
    private object? _lastResult;
    private long _childCalls;

    internal Workload(Spec spec, string? fixtureDirectory = null)
    {
        _spec = spec;
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddWebEncoders();
        services.AddMvcCore().AddCacheTagHelper();
        _services = services.BuildServiceProvider(validateScopes: true);
        _cache = _services.GetRequiredService<IDistributedCache>();
        _service = _services.GetRequiredService<IDistributedCacheTagHelperService>();
        _formatter = _services.GetRequiredService<IDistributedCacheTagHelperFormatter>();
        _storage = _services.GetRequiredService<IDistributedCacheTagHelperStorage>();
        Evidence.Require(_service is DistributedCacheTagHelperService && _formatter is DistributedCacheTagHelperFormatter &&
            _storage is DistributedCacheTagHelperStorage && _cache is MemoryDistributedCache, "Actual public cache-tag-helper registrations required.");
        var method = typeof(DistributedCacheTagHelperService).GetMethod("Encode", BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException("Actual private Encode method missing.");
        _encode = method.CreateDelegate<Func<byte[], byte[], byte[]>>();
        _helper = new DistributedCacheTagHelper(_service, _services.GetRequiredService<HtmlEncoder>())
        {
            Name = new string('k', spec.NameLength) + "\u00e9\u4e2d",
            ViewContext = new ViewContext { HttpContext = new DefaultHttpContext(), RouteData = new RouteData() },
            ExpiresSliding = TimeSpan.FromMinutes(30),
        };
        var key = new CacheTagKey(_helper);
        _keyBytes = Encoding.UTF8.GetBytes(key.GenerateKey());
        _hashedKey = key.GenerateHashedKey();
        var content = new string('x', spec.ContentLength);
        if (spec.Kind is "escaped" or "unicode")
        {
            var pattern = spec.Kind == "escaped" ? "<b>&\"'" : "\u00e9\u4e2d\U0001F30D";
            content = string.Concat(Enumerable.Repeat(pattern, (spec.ContentLength + pattern.Length - 1) / pattern.Length))[..spec.ContentLength];
        }
        if (spec.ExactOutputLength is int exact)
        {
            content = new string('x', exact - sizeof(int) - _keyBytes.Length);
        }
        _child = new DefaultTagHelperContent();
        if (spec.Kind == "raw")
        {
            _child.SetHtmlContent(content);
        }
        else
        {
            _child.SetContent(content);
        }
        _childTask = Task.FromResult(_child);
        _childCallback = (_, _) =>
        {
            _childCalls++;

            return _childTask;
        };
        _rendered = _child.GetContent(_services.GetRequiredService<HtmlEncoder>());
        _formatContext = new DistributedCacheTagHelperFormattingContext { Html = new HtmlString(_rendered) };
        var serialized = _formatter.SerializeAsync(_formatContext);
        Evidence.Require(serialized.IsCompletedSuccessfully, "Actual formatter must complete synchronously for this prepared workload.");
        _payload = serialized.GetAwaiter().GetResult();
        _envelope = _encode(_payload, _keyBytes);
        VerifyProtocol(_envelope);
        if (spec.ExactOutputLength is int expected)
        {
            Evidence.Require(_envelope.Length == expected, "Exact declared output boundary not reached.");
        }
        InputSnapshot = new { spec.Label, spec.Mode, spec.Kind, spec.NameLength, spec.ContentLength, spec.ExactOutputLength,
            name = _helper.Name, key = key.GenerateKey(), childContent = content, renderedContent = _rendered,
            keyUtf8 = Convert.ToBase64String(_keyBytes), payloadUtf8 = Convert.ToBase64String(_payload), nativeLittleEndian = BitConverter.IsLittleEndian };
        var oldFixture = fixtureDirectory is null ? null : Path.Combine(fixtureDirectory, "expected", spec.Label + ".bin");
        if (oldFixture is not null)
        {
            Evidence.Require(_envelope.AsSpan().SequenceEqual(File.ReadAllBytes(oldFixture)), "Current owner encoding differs from exact original fixture.");
        }
        ResetControl(spec.Mode == "Hit" && oldFixture is not null ? File.ReadAllBytes(oldFixture) : _envelope);
    }

    internal object InputSnapshot { get; }
    internal byte[] ExpectedEnvelope => _envelope;

    internal object Run()
    {
        _lastResult = _spec.Mode switch
        {
            "Encode" => _encode(_payload, _keyBytes),
            "Miss" => RunTagHelper(evict: true),
            "Hit" or "Disabled" => RunTagHelper(evict: false),
            "Formatter" => _formatter.SerializeAsync(_formatContext),
            _ => throw new InvalidOperationException("Unrecognized explicit case mode."),
        };

        return _lastResult;
    }

    private Task RunTagHelper(bool evict)
    {
        if (evict)
        {
            _cache.Remove(_hashedKey);
        }
        _lastOutput = new TagHelperOutput("distributed-cache", new TagHelperAttributeList(), _childCallback);

        return _helper.ProcessAsync(_context, _lastOutput);
    }

    private void ResetControl(byte[] seed)
    {
        _cache.Remove(_hashedKey);
        _helper.Enabled = _spec.Mode != "Disabled";
        if (_spec.Mode == "Hit")
        {
            _cache.Set(_hashedKey, seed, _options);
        }
    }

    private void VerifyProtocol(byte[] value)
    {
        Evidence.Require(value.Length == sizeof(int) + _keyBytes.Length + _payload.Length &&
            value.AsSpan(0, sizeof(int)).SequenceEqual(BitConverter.GetBytes(_keyBytes.Length)) &&
            BitConverter.ToInt32(value, 0) == _keyBytes.Length &&
            value.AsSpan(sizeof(int), _keyBytes.Length).SequenceEqual(_keyBytes) &&
            value.AsSpan(sizeof(int) + _keyBytes.Length).SequenceEqual(_payload), "Exact native prefix/key/payload format differs.");
    }

    internal byte[] RunAndObserveOutput()
    {
        var before = _childCalls;
        var result = Run();
        if (result is Task task)
        {
            Evidence.Require(task.IsCompletedSuccessfully, "Only actual synchronously completed prepared operations may be measured.");
            task.GetAwaiter().GetResult();
        }
        if (_spec.Mode == "Encode")
        {
            Evidence.Require(result is byte[] bytes && bytes.AsSpan().SequenceEqual(_envelope), "Direct exact encoded output differs.");
        }
        else if (_spec.Mode == "Formatter")
        {
            Evidence.Require(((Task<byte[]>)result).GetAwaiter().GetResult().AsSpan().SequenceEqual(_payload), "Actual formatter bytes differ.");
        }
        else
        {
            Evidence.Require(_lastOutput is not null && _lastOutput.TagName is null && _lastOutput.Content.GetContent() == _rendered,
                "Actual public tag-helper output differs.");
            Evidence.Require(_childCalls - before == (_spec.Mode == "Hit" ? 0 : 1), "Actual miss/disabled producer or cache-hit control not reached.");
            var stored = _cache.Get(_hashedKey);
            Evidence.Require(_spec.Mode == "Disabled" ? stored is null : stored is not null && stored.AsSpan().SequenceEqual(_envelope),
                "Actual cache entry/removal boundary differs.");
        }

        return _envelope;
    }

    internal object Verify(string directory)
    {
        var inputFile = Path.Combine(directory, "inputs", _spec.Label + ".json");
        var expectedFile = Path.Combine(directory, "expected", _spec.Label + ".bin");
        var expected = File.ReadAllBytes(expectedFile);
        Evidence.Require(Evidence.Compact(InputSnapshot) == Evidence.Compact(System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(File.ReadAllText(inputFile))),
            "Exact synthetic input snapshot differs.");
        Evidence.Require(_envelope.AsSpan().SequenceEqual(expected), "Actual original binary fixture differs.");
        var key = _keyBytes.ToArray();
        var payload = _payload.ToArray();
        var retained = _encode(payload, key);
        var retainedExpected = retained.ToArray();
        Array.Fill(key, (byte)0xF1);
        Array.Fill(payload, (byte)0xC2);
        _encode(new byte[131072], new byte[128]);
        var independent = _encode(_payload, _keyBytes);
        Evidence.Require(retained.AsSpan().SequenceEqual(retainedExpected) && !ReferenceEquals(retained, independent) &&
            independent.AsSpan().SequenceEqual(expected), "Input mutation/subsequent encoding altered retained or independently owned output.");

        _helper.Enabled = true;
        _cache.Remove(_hashedKey);
        var before = _childCalls;
        var produced = RunTagHelper(evict: false);
        Evidence.Require(produced.IsCompletedSuccessfully && _childCalls == before + 1, "Real public tag-helper did not synchronously produce the cache miss.");
        produced.GetAwaiter().GetResult();
        var stored = _storage.GetAsync(_hashedKey);
        Evidence.Require(stored.IsCompletedSuccessfully && stored.GetAwaiter().GetResult().AsSpan().SequenceEqual(expected) &&
            _lastOutput?.Content.GetContent() == _rendered, "Real registered pipeline did not store exact envelope and HTML.");
        var hit = new TagHelperOutput("distributed-cache", new TagHelperAttributeList(),
            (_, _) => throw new InvalidOperationException("Actual next hit unexpectedly reran child content."));
        var hitTask = _helper.ProcessAsync(_context, hit);
        Evidence.Require(hitTask.IsCompletedSuccessfully, "Actual next cache hit not complete.");
        hitTask.GetAwaiter().GetResult();
        Evidence.Require(hit.Content.GetContent() == _rendered && _childCalls == before + 1, "Actual stored bytes did not decode into next-hit HTML.");
        ResetControl(expected);
        RunAndObserveOutput();

        return new
        {
            _spec.Label, _spec.Mode, inputSha256 = Evidence.Hash(inputFile), outputSha256 = Evidence.Hash(expectedFile), outputBytes = expected.Length,
            exactNativePrefixKeyPayload = true, independentlyOwnedAcrossInputMutation = true, retainedAcrossLargerCall = true,
            realRegisteredPipelineStoreAndNextHitVerified = true, actualPreparedTimedModeVerified = true,
            preparedOperationsSynchronouslyComplete = true, noPrivateCallbackInjection = true,
            Binding = new
            {
                service = _service.GetType().AssemblyQualifiedName, formatter = _formatter.GetType().AssemblyQualifiedName,
                storage = _storage.GetType().AssemblyQualifiedName, cache = _cache.GetType().AssemblyQualifiedName,
                encoder = _services.GetRequiredService<HtmlEncoder>().GetType().AssemblyQualifiedName,
                privateEncodeBoundOnceOutsideTimingByHarnessOnly = true,
                missIncludesExplicitCacheRemovalAndNewOutput = true, childContentPreparedOutsideTiming = true,
                fixtureEnvelopeNormalizesControlsRatherThanClaimingTheirActualResultIsEnvelope = true,
                noRazorHttpExternalStoreOrProductionFrequencyClaim = true,
            }
        };
    }

    public void Dispose()
    {
        _services.Dispose();
    }
}
