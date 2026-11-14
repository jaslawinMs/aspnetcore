using System.Collections.Frozen;
using System.Globalization;
using System.Net;
using System.Reflection;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Owin;
using Microsoft.Extensions.DependencyInjection;

[MemoryDiagnoser]
public class OwinFeatureMapBenchmark
{
    private DefaultHttpContext _context = null!;
    private IDictionary<string, object> _environment = null!;
    private Operation _operation;
    private string _key = "";
    private object? _result;
    private bool _found;
    private MemoryStream _body = null!;
    private RequestDelegate? _pipeline;
    private ServiceProvider? _services;
    private bool _verify;
    private int _nextCalls;
    private int _checksum;
    private string[] _originalOrder = [];
    private int _originalCount;

    public static IEnumerable<string> Cases =>
    [
        "Get_Method", "Get_Path", "Get_Query", "Get_Status", "Get_ConnectionId",
        "Get_RequestHeaders", "Get_ResponseBody", "Try_Method",
        "Try_AbsentConnection", "Try_Unknown", "Try_Item", "Try_CaseVariant",
        "Contains_Method", "Contains_AbsentFeature", "SetRead_Method",
        "AddRemove_Item", "Removed_Method", "Copied_Method", "Custom_Map",
        "Enumerate", "Keys", "Copy", "Materialize_Maps", "Construct_WarmContext",
        "Pipeline_NoRead", "Pipeline_ReadCommon", "Pipeline_ReadHeaders",
        "Pipeline_PortsPresent", "Pipeline_PortsMissing",
    ];

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        _verify = true;
        _body = new MemoryStream();
        _context = CreateContext(_body);
        if (Case is "Try_AbsentConnection" or "Pipeline_PortsMissing")
        {
            _context.Features.Set<IHttpConnectionFeature>(null);
        }
        var wrapper = new OwinEnvironment(_context);
        _environment = wrapper;
        (_operation, _key) = Case switch
        {
            "Get_Method" => (Operation.Get, "owin.RequestMethod"),
            "Get_Path" => (Operation.Get, "owin.RequestPath"),
            "Get_Query" => (Operation.Get, "owin.RequestQueryString"),
            "Get_Status" => (Operation.Get, "owin.ResponseStatusCode"),
            "Get_ConnectionId" => (Operation.Get, "server.ConnectionId"),
            "Get_RequestHeaders" => (Operation.Get, "owin.RequestHeaders"),
            "Get_ResponseBody" => (Operation.Get, "owin.ResponseBody"),
            "Try_Method" or "Removed_Method" or "Copied_Method" or "Custom_Map"
                => (Operation.TryGet, "owin.RequestMethod"),
            "Try_AbsentConnection" => (Operation.TryGet, "server.RemotePort"),
            "Try_Unknown" => (Operation.TryGet, "myapp.Unknown"),
            "Try_Item" => (Operation.TryGet, "myapp.State"),
            "Try_CaseVariant" => (Operation.TryGet, "OWIN.RequestMethod"),
            "Contains_Method" => (Operation.Contains, "owin.RequestMethod"),
            "Contains_AbsentFeature" => (Operation.Contains, "ssl.ClientCertificate"),
            "SetRead_Method" => (Operation.SetRead, "owin.RequestMethod"),
            "AddRemove_Item" => (Operation.AddRemove, "myapp.Transient"),
            "Enumerate" => (Operation.Enumerate, ""),
            "Keys" => (Operation.Keys, ""),
            "Copy" => (Operation.Copy, ""),
            "Materialize_Maps" => (Operation.Materialize, ""),
            "Construct_WarmContext" => (Operation.Construct, ""),
            _ when Case.StartsWith("Pipeline_", StringComparison.Ordinal) => (Operation.Pipeline, ""),
            _ => throw new ArgumentException("Unknown scenario.", nameof(Case)),
        };
        if (Case == "Removed_Method")
        {
            Require(_environment.Remove(_key), "Actual mapped removal did not run.");
        }
        else if (Case is "Copied_Method" or "Custom_Map")
        {
            var maps = wrapper.FeatureMaps;
            if (Case == "Custom_Map")
            {
                maps[_key] = new OwinEnvironment.FeatureMap<IHttpRequestFeature>(feature => feature.Protocol);
            }
        }
        if (_operation == Operation.Pipeline)
        {
            _services = new ServiceCollection().BuildServiceProvider();
            var builder = new ApplicationBuilder(_services);
            builder.UseOwin(add => add(next => Next));
            _pipeline = builder.Build();
        }
        _originalCount = _environment.Count;
        _originalOrder = _environment.Select(pair => pair.Key).ToArray();

        Execute().GetAwaiter().GetResult();
        VerifyResult();

        object? observed = _result;
        if (_result is IDictionary<string, string[]> headers)
        {
            observed = headers.ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
        }
        else if (_result is ICollection<string> keys)
        {
            observed = keys.OrderBy(key => key, StringComparer.Ordinal).ToArray();
        }
        else if (_result is KeyValuePair<string, object>[] pairs)
        {
            observed = pairs.Where(pair => pair.Key is not null).Select(pair => pair.Key)
                .OrderBy(key => key, StringComparer.Ordinal).ToArray();
        }
        else if (_result is IDictionary<string, OwinEnvironment.FeatureMap> maps)
        {
            observed = maps.Keys.OrderBy(key => key, StringComparer.Ordinal).ToArray();
        }
        else if (_result is Stream)
        {
            observed = "actual-response-body-identity";
        }
        else if (_result is OwinEnvironment)
        {
            observed = "actual-warm-context-environment";
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            scenario = Case,
            producer = "DefaultHttpContext actual HTTP feature state and OwinEnvironment feature maps",
            entry = _pipeline is null ? "Complete public OwinEnvironment operation" : "UseOwin default registered pipeline",
            operation = _operation.ToString(),
            key = _key,
            observed,
            found = _found,
            environment_count = _environment.Count,
            request_method = _context.Request.Method,
            response_status = _context.Response.StatusCode,
            body_identity_preserved = ReferenceEquals(_body, _context.Response.Body),
            verified_order = _operation is Operation.Enumerate or Operation.Keys or Operation.Copy or Operation.Materialize,
            next_calls = _nextCalls,
            pipeline_checksum = _checksum,
            hosted_http_or_cold_static_initialization_claim = false,
        }));
        _verify = false;
    }

    [Benchmark]
    public Task Execute()
    {
        switch (_operation)
        {
            case Operation.Get:
                _result = _environment[_key];
                break;
            case Operation.TryGet:
                _found = _environment.TryGetValue(_key, out _result);
                break;
            case Operation.Contains:
                _found = _environment.ContainsKey(_key);
                break;
            case Operation.SetRead:
                _environment[_key] = "PATCH";
                _result = _environment[_key];
                break;
            case Operation.AddRemove:
                _environment.Add(_key, "transient");
                _found = _environment.Remove(_key);
                break;
            case Operation.Enumerate:
                _result = _environment.ToArray();
                break;
            case Operation.Keys:
                _result = _environment.Keys;
                break;
            case Operation.Copy:
                var copy = new KeyValuePair<string, object>[_environment.Count];
                _environment.CopyTo(copy, 0);
                _result = copy;
                break;
            case Operation.Materialize:
                _result = new OwinEnvironment(_context).FeatureMaps;
                break;
            case Operation.Construct:
                _result = new OwinEnvironment(_context);
                break;
            case Operation.Pipeline:
                return _pipeline!(_context);
            default:
                throw new InvalidOperationException("Unconfigured operation.");
        }
        return Task.CompletedTask;
    }

    private Task Next(IDictionary<string, object> environment)
    {
        if (_verify)
        {
            _nextCalls++;
            Require(environment is OwinEnvironment, "Default UseOwin producer did not run.");
        }
        switch (Case)
        {
            case "Pipeline_NoRead":
                _checksum = 0;
                break;
            case "Pipeline_ReadCommon":
                _checksum = ((string)environment["owin.RequestMethod"]).Length
                    + ((string)environment["owin.RequestPath"]).Length
                    + ((string)environment["owin.RequestQueryString"]).Length
                    + ((string)environment["owin.RequestScheme"]).Length
                    + ((string)environment["owin.RequestProtocol"]).Length
                    + ((string)environment["server.ConnectionId"]).Length
                    + (int)environment["owin.ResponseStatusCode"];
                break;
            case "Pipeline_ReadHeaders":
                var requestHeaders = (IDictionary<string, string[]>)environment["owin.RequestHeaders"];
                var responseHeaders = (IDictionary<string, string[]>)environment["owin.ResponseHeaders"];
                _checksum = requestHeaders["x-request"][0].Length + responseHeaders["x-response"][0].Length;
                break;
            case "Pipeline_PortsPresent":
            case "Pipeline_PortsMissing":
                var localFound = environment.TryGetValue("server.LocalPort", out var local);
                var remoteFound = environment.TryGetValue("server.RemotePort", out var remote);
                _found = localFound && remoteFound;
                _checksum = _found
                    ? int.Parse((string)local!, CultureInfo.InvariantCulture) + int.Parse((string)remote!, CultureInfo.InvariantCulture)
                    : 0;
                break;
            default:
                throw new InvalidOperationException("Unconfigured pipeline.");
        }
        environment["owin.ResponseStatusCode"] = 201;
        return Task.CompletedTask;
    }

    private void VerifyResult()
    {
        Require(_context.Features.Get<IHttpRequestFeature>()?.Method == _context.Request.Method,
            "Actual HTTP request feature producer mismatch.");
        Require(ReferenceEquals(_body, _context.Response.Body), "Context-specific response body changed.");
        if (_operation == Operation.Pipeline)
        {
            var expected = Case switch
            {
                "Pipeline_NoRead" or "Pipeline_PortsMissing" => 0,
                "Pipeline_ReadCommon" => 3 + 10 + 6 + 5 + 8 + 13 + 201,
                "Pipeline_ReadHeaders" => 7 + 8,
                "Pipeline_PortsPresent" => 80 + 443,
                _ => throw new InvalidOperationException("Unconfigured pipeline expectation."),
            };
            Require(_nextCalls == 1 && _checksum == expected && _context.Response.StatusCode == 201,
                "Complete actual pipeline checksum/status mismatch.");
            Require(Case != "Pipeline_PortsMissing" || !_found, "Absent port feature unexpectedly produced values.");
            return;
        }
        if (_operation is Operation.Enumerate or Operation.Copy)
        {
            var pairs = (KeyValuePair<string, object>[])_result!;
            Require(pairs.Take(_originalOrder.Length).Select(pair => pair.Key).SequenceEqual(_originalOrder),
                "Actual full enumeration/copy order mismatch.");
            Require(ReferenceEquals(pairs.Single(pair => pair.Key == "owin.ResponseBody").Value, _body),
                "Actual enumeration/copy body mismatch.");
        }
        else if (_operation == Operation.Keys)
        {
            Require(((ICollection<string>)_result!).SequenceEqual(_originalOrder), "Actual Keys order mismatch.");
        }
        else if (_operation == Operation.Materialize)
        {
            var maps = (IDictionary<string, OwinEnvironment.FeatureMap>)_result!;
            var legacy = GetLegacyEntries();
            Require(maps.Keys.SequenceEqual(legacy.Keys.Append("owin.ResponseBody")), "Public map copy changed legacy order.");
        }
        else if (_operation == Operation.Construct)
        {
            var created = (IDictionary<string, object>)_result!;
            Require((string)created["owin.RequestMethod"] == "GET", "Real warm-context constructor mismatch.");
        }
        else if (Case == "Get_RequestHeaders")
        {
            var headers = (IDictionary<string, string[]>)_result!;
            Require(headers.Count == 1 && headers["x-request"].SequenceEqual(["request"]), "Complete header producer mismatch.");
        }
        else if (Case == "Get_ResponseBody")
        {
            Require(ReferenceEquals(_result, _body), "Actual response-body feature mismatch.");
        }
        else if (_operation == Operation.Contains)
        {
            Require(GetLegacyEntries().ContainsKey(_key), "Contains scenario did not target a real mapped key.");
            Require(_found == (Case == "Contains_Method"), "Actual ContainsKey result mismatch.");
        }
        else if (_operation == Operation.AddRemove)
        {
            Require(_found && !_context.Items.ContainsKey(_key) && _environment.Count == _originalCount,
                "Complete Add/Remove did not restore original state.");
        }
        else if (Case is "Try_AbsentConnection" or "Try_Unknown" or "Removed_Method")
        {
            Require(!_found && _result is null, "Actual absent/removed path unexpectedly produced a value.");
        }
        else
        {
            object expected = Case switch
            {
                "Get_Method" or "Try_Method" or "Copied_Method" => "GET",
                "Get_Path" => "/orders/42",
                "Get_Query" => "page=2",
                "Get_Status" => 201,
                "Get_ConnectionId" => "connection-id",
                "Try_Item" => "item",
                "Try_CaseVariant" => "case-item",
                "SetRead_Method" => "PATCH",
                "Custom_Map" => "HTTP/1.1",
                _ => throw new InvalidOperationException("Unconfigured scalar expectation."),
            };
            Require(Equals(_result, expected) && (_operation != Operation.TryGet || _found), "Complete public lookup mismatch.");
            if (Case == "Try_CaseVariant")
            {
                Require(_context.Request.Method == "GET", "Ordinal item key overwrote native method.");
            }
        }
    }

    private static DefaultHttpContext CreateContext(Stream body)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = "GET";
        context.Request.Protocol = "HTTP/1.1";
        context.Request.Scheme = "https";
        context.Request.Path = "/orders/42";
        context.Request.PathBase = "/shop";
        context.Request.QueryString = new QueryString("?page=2");
        context.Request.Headers["x-request"] = "request";
        context.Response.Headers["x-response"] = "response";
        context.Response.StatusCode = 201;
        context.Response.Body = body;
        context.Connection.Id = "connection-id";
        context.Connection.LocalIpAddress = IPAddress.Loopback;
        context.Connection.RemoteIpAddress = IPAddress.IPv6Loopback;
        context.Connection.LocalPort = 80;
        context.Connection.RemotePort = 443;
        context.Items["myapp.State"] = "item";
        context.Items["OWIN.RequestMethod"] = "case-item";
        return context;
    }

    private static IReadOnlyDictionary<string, OwinEnvironment.FeatureMap> GetLegacyEntries()
    {
        var type = typeof(OwinEnvironment).GetNestedType("OwinEntries", BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("Missing actual entries owner.");
        var field = type.GetField("_entries", BindingFlags.Static | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("Missing actual legacy map.");
        return (IReadOnlyDictionary<string, OwinEnvironment.FeatureMap>)(field.GetValue(null)
            ?? throw new InvalidOperationException("Missing actual legacy map value."));
    }

    public static object VerifyStorage()
    {
        using var body = new MemoryStream();
        var context = CreateContext(body);
        var wrapper = new OwinEnvironment(context);
        var legacy = GetLegacyEntries();
        var type = typeof(OwinEnvironment).GetNestedType("OwinEntries", BindingFlags.NonPublic)!;
        var indexField = type.GetField("_lookupEntries", BindingFlags.Static | BindingFlags.NonPublic);
        var index = indexField?.GetValue(null) as FrozenDictionary<string, OwinEnvironment.FeatureMap>;
        if (indexField is not null)
        {
            if (index is null)
            {
                throw new InvalidOperationException("Experiment lookup index is not read-only frozen storage.");
            }
            Require(index.Count == legacy.Count && index.Comparer.Equals(StringComparer.Ordinal),
                "Frozen index count/comparer differs from the legacy map.");
            foreach (var pair in legacy)
            {
                Require(index.TryGetValue(pair.Key, out var actual) && ReferenceEquals(actual, pair.Value),
                    "Index does not reference every original feature map.");
            }
        }
        var maps = wrapper.FeatureMaps;
        Require(legacy.Count == 25 && maps.Keys.SequenceEqual(legacy.Keys.Append("owin.ResponseBody")),
            "Actual public map copy did not preserve all original maps/order/context body.");
        return new
        {
            legacy_map_count = legacy.Count,
            legacy_map_type = legacy.GetType().FullName,
            lookup_index_present = indexField is not null,
            lookup_index_is_frozen = index is not null,
            lookup_count = index?.Count,
            ordinal_comparer = index?.Comparer.Equals(StringComparer.Ordinal),
            all_original_feature_map_references_shared = index is null ? (bool?)null : true,
            public_copy_order_preserved = true,
            response_body_identity = ReferenceEquals(((IDictionary<string, object>)wrapper)["owin.ResponseBody"], body),
            cold_initialization_performance_claimed = false,
        };
    }

    private static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _services?.Dispose();
        _body?.Dispose();
    }

    private enum Operation
    {
        Get, TryGet, Contains, SetRead, AddRemove, Enumerate, Keys, Copy,
        Materialize, Construct, Pipeline,
    }
}
