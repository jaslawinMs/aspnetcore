using System.Net.WebSockets;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Owin;
using Microsoft.Extensions.DependencyInjection;
using AppFunc = System.Func<System.Collections.Generic.IDictionary<string, object>, System.Threading.Tasks.Task>;
using OwinAccept = System.Action<System.Collections.Generic.IDictionary<string, object>, System.Func<System.Collections.Generic.IDictionary<string, object>, System.Threading.Tasks.Task>>;

[MemoryDiagnoser]
public class WebSocketAcceptAdapterBenchmark
{
    private static readonly byte[] Payload = [0x10, 0x20, 0x30];
    private DefaultHttpContext _context = null!;
    private IDictionary<string, object> _environment = null!;
    private AppFunc _app = null!;
    private RequestDelegate? _pipeline;
    private ServiceProvider? _services;
    private AcceptFeature _feature = null!;
    private bool _fullUpgrade;
    private bool _verify;
    private int _nextCalls;
    private int _callbackCalls;
    private string _expectedProtocol = "";
    private bool _nativeContext;
    private WebSocketAcceptContext? _suppliedContext;

    public static IEnumerable<string> Cases =>
    [
        "Missing", "WrongObject", "StandardAccept", "Feature_NotRequest",
        "Typed_Dictionary", "Typed_Dynamic", "Typed_Status101_NoCallback",
        "Typed_Callback_Status200", "Upgrade_OwinOptions",
        "Pipeline_NoUpgrade", "Pipeline_Upgrade",
    ];

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        _verify = true;
        _fullUpgrade = Case is "Upgrade_OwinOptions" or "Pipeline_Upgrade";
        _nativeContext = Case == "Pipeline_Upgrade";
        _expectedProtocol = _fullUpgrade ? "chat" : "";
        _feature = new AcceptFeature
        {
            IsWebSocketRequest = Case != "Feature_NotRequest",
            FullUpgrade = _fullUpgrade,
            Verify = true,
        };
        _context = new DefaultHttpContext();
        _context.Features.Set<IHttpWebSocketFeature>(_feature);
        _context.Response.StatusCode = 200;
        if (Case == "Missing")
        {
            _context.Features.Set<IHttpWebSocketFeature>(null);
        }
        IDictionary<string, object> produced = new OwinEnvironment(_context);
        var typedExpected = Case is not ("Missing" or "Feature_NotRequest" or "WrongObject" or "StandardAccept");
        if (typedExpected &&
            (!produced.TryGetValue("websocket.AcceptAlt", out var actual) ||
            actual.GetType() != typeof(Func<WebSocketAcceptContext, Task<WebSocket>>)))
        {
            throw new InvalidOperationException($"Actual OwinEnvironment did not produce the typed delegate: {Case}");
        }
        _environment = Case is "Typed_Dynamic" or "Feature_NotRequest" or "Missing"
            ? produced : new Dictionary<string, object>(produced);
        if (Case == "WrongObject")
        {
            _environment["websocket.AcceptAlt"] = new WebSocketAcceptContext();
        }
        else if (Case == "StandardAccept")
        {
            _environment["websocket.AcceptAlt"] = new OwinAccept((options, callback) =>
                throw new InvalidOperationException("Wrong accept delegate invoked."));
        }
        _suppliedContext = _nativeContext ? new WebSocketAcceptContext { SubProtocol = "chat" } : null;
        if (Case.StartsWith("Pipeline_", StringComparison.Ordinal))
        {
            _services = new ServiceCollection().BuildServiceProvider();
            var builder = new ApplicationBuilder(_services);
            builder.UseOwin(add => add(next => Next));
            _pipeline = builder.Build();
        }
        else
        {
            _app = WebSocketAcceptAdapter.AdaptWebSockets(Next);
        }

        AdaptedRequest().GetAwaiter().GetResult();
        var finalStatus = Case is "Typed_Status101_NoCallback" or "Upgrade_OwinOptions" or "Pipeline_Upgrade" ? 101 : 200;
        if (_nextCalls != 1 || _callbackCalls != (_fullUpgrade ? 1 : 0) ||
            _feature.AcceptCalls != (_fullUpgrade ? 1 : 0) ||
            (_pipeline is null ? (int)_environment["owin.ResponseStatusCode"] : _context.Response.StatusCode) != finalStatus)
        {
            throw new InvalidOperationException($"Complete next/accept/callback/status mismatch: {Case}");
        }
        string? frameHex = null;
        if (_fullUpgrade)
        {
            if (_feature.StateAtRelease != WebSocketState.Aborted ||
                _feature.AcceptedContext?.SubProtocol != _expectedProtocol ||
                (_nativeContext && !ReferenceEquals(_suppliedContext, _feature.AcceptedContext)))
            {
                throw new InvalidOperationException($"Real accept context/abort mismatch: {Case}");
            }
            var bytes = _feature.Transport?.ToArray() ?? throw new InvalidOperationException("Missing real frame transport.");
            frameHex = Convert.ToHexString(bytes);
            using var frames = new MemoryStream(bytes);
            using var client = WebSocket.CreateFromStream(frames, isServer: false,
                subProtocol: _expectedProtocol, keepAliveInterval: Timeout.InfiniteTimeSpan);
            var buffer = new byte[16];
            var received = client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None).GetAwaiter().GetResult();
            if (received.MessageType != WebSocketMessageType.Binary || !received.EndOfMessage ||
                received.Count != Payload.Length || !buffer.AsSpan(0, received.Count).SequenceEqual(Payload))
            {
                throw new InvalidOperationException($"Actual peer binary-frame mismatch: {Case}");
            }
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            scenario = Case,
            producer = "OwinEnvironment IHttpWebSocketFeature feature map",
            entry = _pipeline is null ? "AdaptWebSockets" : "UseOwin default registered adapter",
            environment_type = _pipeline is null ? _environment.GetType().FullName : typeof(OwinEnvironment).FullName,
            alternate_delegate_expected = typedExpected,
            next_calls = _nextCalls,
            accept_calls = _feature.AcceptCalls,
            callback_calls = _callbackCalls,
            response_status = finalStatus,
            real_websocket_frames = frameHex,
            native_context_identity = _nativeContext,
            subprotocol = _fullUpgrade ? _expectedProtocol : null,
            cleanup_state = _fullUpgrade ? _feature.StateAtRelease.ToString() : null,
            snapshot_or_hosted_http_claim = false,
        }));
        _verify = false;
        _feature.Verify = false;
    }

    private Task Next(IDictionary<string, object> environment)
    {
        if (_verify)
        {
            _nextCalls++;
            if (_pipeline is null && !ReferenceEquals(environment, _environment))
            {
                throw new InvalidOperationException("Adapter changed environment identity.");
            }
            var shouldHaveAccept = Case is not ("Missing" or "WrongObject" or "StandardAccept" or "Feature_NotRequest");
            if (environment.TryGetValue("websocket.Accept", out var accept) != shouldHaveAccept ||
                (shouldHaveAccept && accept is not OwinAccept))
            {
                throw new InvalidOperationException("Wrong type guard/accept delegate result.");
            }
        }
        if (_fullUpgrade)
        {
            var accept = (OwinAccept)environment["websocket.Accept"];
            IDictionary<string, object> options = _nativeContext
                ? new Dictionary<string, object> { [typeof(WebSocketAcceptContext).FullName!] = _suppliedContext! }
                : new Dictionary<string, object> { ["websocket.SubProtocol"] = _expectedProtocol };
            accept(options, SocketCallback);
        }
        else if (Case == "Typed_Callback_Status200")
        {
            ((OwinAccept)environment["websocket.Accept"])(new Dictionary<string, object>(), SocketCallback);
            environment["owin.ResponseStatusCode"] = 200;
        }
        else
        {
            environment["owin.ResponseStatusCode"] = Case == "Typed_Status101_NoCallback" ? 101 : 200;
        }
        return Task.CompletedTask;
    }

    private Task SocketCallback(IDictionary<string, object> environment)
    {
        if (_verify)
        {
            _callbackCalls++;
            if (!ReferenceEquals(environment[typeof(WebSocket).FullName!], _feature.Socket) ||
                (CancellationToken)environment["websocket.CallCancelled"] != _context.RequestAborted ||
                (string)environment["websocket.Version"] != "1.0")
            {
                throw new InvalidOperationException("Actual callback socket/token/version mismatch.");
            }
        }
        var send = (Func<ArraySegment<byte>, int, bool, CancellationToken, Task>)environment["websocket.SendAsync"];
        return send(new ArraySegment<byte>(Payload), 2, true, CancellationToken.None);
    }

    [Benchmark]
    public Task AdaptedRequest()
    {
        var task = _pipeline is null ? _app(_environment) : _pipeline(_context);
        return _fullUpgrade ? CompleteAndReleaseAsync(task) : task;
    }

    private async Task CompleteAndReleaseAsync(Task task)
    {
        try
        {
            await task;
        }
        finally
        {
            _feature.Release();
        }
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _feature?.Release();
        _services?.Dispose();
    }

    private sealed class AcceptFeature : IHttpWebSocketFeature
    {
        public bool IsWebSocketRequest { get; init; }
        public bool FullUpgrade { get; init; }
        public bool Verify { get; set; }
        public int AcceptCalls { get; private set; }
        public MemoryStream? Transport { get; private set; }
        public WebSocket? Socket { get; private set; }
        public WebSocketAcceptContext? AcceptedContext { get; private set; }
        public WebSocketState StateAtRelease { get; private set; }

        public Task<WebSocket> AcceptAsync(WebSocketAcceptContext? context)
        {
            if (!FullUpgrade)
            {
                throw new InvalidOperationException("Unexpected accept in non-upgrade scenario.");
            }
            if (Verify)
            {
                AcceptCalls++;
            }
            AcceptedContext = context;
            Transport = new MemoryStream();
            Socket = WebSocket.CreateFromStream(Transport, isServer: true,
                subProtocol: context?.SubProtocol, keepAliveInterval: Timeout.InfiniteTimeSpan);
            return Task.FromResult(Socket);
        }

        public void Release()
        {
            if (Socket is not null)
            {
                StateAtRelease = Socket.State;
                Socket.Dispose();
                Transport?.Dispose();
            }
        }
    }
}
