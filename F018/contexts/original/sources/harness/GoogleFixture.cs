using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AutoPerf;

internal sealed record GoogleProfile(string Name, int Padding = 0, string EncodingName = "utf-8",
    string? Charset = "utf-8", bool Bom = false, bool UnicodePadding = false,
    bool InvalidUtf8 = false, string Body = "Object", HttpStatusCode Status = HttpStatusCode.OK, bool Version2 = false);

internal static class GoogleProfiles
{
    public static readonly GoogleProfile[] All =
    [
        new("Utf8Small"),
        new("Utf8Typical1K", 1024),
        new("Utf8Large16K", 16384),
        new("Utf8Large64K", 65536),
        new("Utf8Unicode16K", 16384, UnicodePadding: true),
        new("Utf8Bom16K", 16384, Bom: true),
        new("Utf8Uppercase", Charset: "UTF-8"),
        new("Utf8Quoted1K", 1024, Charset: "\"utf-8\""),
        new("Utf8NoCharset1K", 1024, Charset: null),
        new("Utf8NoCharset16K", 16384, Charset: null),
        new("Utf16Small", EncodingName: "utf-16", Charset: "utf-16"),
        new("Utf16Large16K", 16384, "utf-16", "utf-16"),
        new("Utf16BomNoCharset", EncodingName: "utf-16", Charset: null, Bom: true),
        new("Latin1Small", EncodingName: "iso-8859-1", Charset: "iso-8859-1"),
        new("Latin1Large16K", 16384, "iso-8859-1", "iso-8859-1"),
        new("InvalidUtf8Small", EncodingName: "iso-8859-1", InvalidUtf8: true),
        new("InvalidUtf8Large16K", 16384, "iso-8859-1", InvalidUtf8: true),
        new("V2Identifier", Version2: true),
        new("EmptyJsonControl", Body: "Empty"),
        new("BomOnlyJsonControl", Bom: true, Body: "Empty"),
        new("DoubleBomJsonControl", Bom: true, Body: "DoubleBom"),
        new("TrailingJsonControl", Body: "Trailing"),
        new("MalformedJsonControl", Body: "Malformed"),
        new("FailedHttpControl", Status: HttpStatusCode.BadRequest),
    ];
}

internal sealed class GoogleFixture : IDisposable
{
    private readonly GoogleProfile _profile;
    private readonly string? _cancellationMode;
    private readonly CancellationTokenSource _aborted = new();
    private readonly ServiceProvider _services;
    private readonly BackchannelProducer _producer;
    private readonly HttpClient _client;
    private readonly ExposedGoogleHandler _owner;
    private readonly OAuthTokenResponse _tokens;
    private readonly string _expectedName;
    private bool _capture;
    private JsonElement _capturedPayload;
    private int _eventCalls;
    private int _requestDelta;
    private AuthenticationTicket? _lastTicket;
    private string? _lastFailure;

    public GoogleFixture(GoogleProfile profile, string? cancellationMode = null)
    {
        Evidence.Require(cancellationMode is null or "BeforeRequest" or "DuringBuffer" or "AfterBuffer", "Known actual cancellation producer mode required.");
        _profile = profile;
        _cancellationMode = cancellationMode;
        var padding = new string(profile.UnicodePadding ? '\u00E9' : 'x', profile.Padding);
        var identifierKey = profile.Version2 ? "id" : "sub";
        var body = profile.Body switch
        {
            "Empty" => "",
            "Trailing" => "{} {}",
            "Malformed" => "{\"name\":",
            _ => "{\"" + identifierKey + "\":\"profile-id\",\"name\":\"caf\u00E9 \\u03A9 \\ud83d\\ude00\\nname\",\"given_name\":\"Test Given Name\",\"family_name\":\"Test Family Name\",\"email\":\"user@example.com\",\"padding\":\"" + padding + "\"}",
        };
        var encoding = Encoding.GetEncoding(profile.EncodingName);
        var bytes = encoding.GetBytes(body);
        if (profile.Bom)
        {
            bytes = profile.Body == "DoubleBom"
                ? [.. encoding.GetPreamble(), .. encoding.GetPreamble(), .. bytes]
                : [.. encoding.GetPreamble(), .. bytes];
        }
        _expectedName = profile.InvalidUtf8 ? "caf\uFFFD \u03A9 \U0001F600\nname" : "caf\u00E9 \u03A9 \U0001F600\nname";
        _producer = new BackchannelProducer(bytes, profile.Charset, profile.Status, _aborted, cancellationMode);
        _client = new HttpClient(_producer);
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthentication().AddGoogle(options =>
        {
            options.ClientId = "benchmark-client";
            options.ClientSecret = "benchmark-placeholder";
            options.Backchannel = _client;
            options.Events = new OAuthEvents
            {
                OnCreatingTicket = async context =>
                {
                    if (_capture)
                    {
                        _eventCalls++;
                        _capturedPayload = context.User;
                        await Task.Yield();
                        Evidence.Require(context.User.GetProperty("name").GetString() == _expectedName &&
                            context.User.GetProperty(identifierKey).GetString() == "profile-id" &&
                            context.User.GetProperty("padding").GetString() == padding,
                            "Actual awaited CreatingTicket must retain the exact decoded name/id/padding.");
                    }
                }
            };
        });
        services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider(NullLoggerFactory.Instance));
        _services = services.BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = _services };
        context.Request.Scheme = "https";
        context.Request.Host = new HostString("app.example");
        context.RequestAborted = _aborted.Token;
        _owner = new ExposedGoogleHandler(_services.GetRequiredService<IOptionsMonitor<GoogleOptions>>(),
            NullLoggerFactory.Instance, UrlEncoder.Default);
        _owner.InitializeAsync(new AuthenticationScheme(GoogleDefaults.AuthenticationScheme, null, typeof(GoogleHandler)), context)
            .GetAwaiter().GetResult();
        _tokens = OAuthTokenResponse.Success(JsonDocument.Parse("{\"access_token\":\"benchmark-token\"}"));
        if (cancellationMode == "BeforeRequest")
        {
            _aborted.Cancel();
        }
    }

    public async Task<int> Exercise()
    {
        _lastTicket = null;
        _lastFailure = null;
        var before = _producer.Requests;
        try
        {
            var ticket = await _owner.Create(new ClaimsIdentity(GoogleDefaults.AuthenticationScheme), new AuthenticationProperties(), _tokens);
            _lastTicket = ticket;

            return ticket.Principal.Claims.Count() ^ (ticket.Principal.Identity?.Name?.Length ?? 0);
        }
        catch (JsonException) when (_profile.Body != "Object")
        {
            _lastFailure = nameof(JsonException);

            return -101;
        }
        catch (HttpRequestException) when (_profile.Status != HttpStatusCode.OK)
        {
            _lastFailure = nameof(HttpRequestException);

            return -102;
        }
        catch (OperationCanceledException) when (_cancellationMode is not null)
        {
            _lastFailure = nameof(OperationCanceledException);

            return -103;
        }
        finally
        {
            _requestDelta = _producer.Requests - before;
            _producer.DisposeRequestResponse();
        }
    }

    public async Task<object> CaptureContract(string phase)
    {
        _capture = true;
        _eventCalls = 0;
        _capturedPayload = default;
        var result = await Exercise();
        _capture = false;
        var documentDisposed = false;
        if (_lastTicket is not null)
        {
            Evidence.Require(_lastTicket.Principal.Identity?.Name == _expectedName &&
                _lastTicket.Principal.FindFirst(ClaimTypes.NameIdentifier)?.Value == "profile-id" &&
                _lastTicket.Principal.FindFirst(ClaimTypes.GivenName)?.Value == "Test Given Name" &&
                _lastTicket.Principal.FindFirst(ClaimTypes.Surname)?.Value == "Test Family Name" &&
                _lastTicket.Principal.FindFirst(ClaimTypes.Email)?.Value == "user@example.com" && _eventCalls == 1,
                "Actual returned ticket must preserve all expected Google claims and one awaited event.");
            try
            {
                _capturedPayload.GetProperty(_profile.Version2 ? "id" : "sub");
            }
            catch (ObjectDisposedException)
            {
                documentDisposed = true;
            }
            Evidence.Require(documentDisposed, "Actual Google payload must be disposed after the awaited event.");
        }
        else
        {
            Evidence.Require(_eventCalls == 0, "No CreatingTicket event after a parse/status/cancellation failure.");
        }
        var expectedRequests = _cancellationMode == "BeforeRequest" ? 0 : 1;
        Evidence.Require(_requestDelta == expectedRequests, "Actual producer reachability must match the specified precondition.");
        if (expectedRequests == 1)
        {
            Evidence.Require(_producer.LastRequestUri?.AbsoluteUri == GoogleDefaults.UserInformationEndpoint &&
                _producer.LastMethod == "GET" && _producer.LastAuthorization == "Bearer benchmark-token" && _producer.ResponseDisposed,
                "Actual default endpoint/GET/Bearer request and uniform external cleanup required.");
        }
        if (_cancellationMode is "BeforeRequest" or "DuringBuffer")
        {
            Evidence.Require(_lastTicket is null && _lastFailure == nameof(OperationCanceledException) && _eventCalls == 0 &&
                _producer.SerializedBytes == 0 && _aborted.IsCancellationRequested, "Real before/during-buffer producer must cancel before ticket creation.");
        }
        else
        {
            Evidence.Require(_producer.SerializedBytes == _producer.PayloadBytes, "Real SendAsync must have buffered the complete produced content.");
            var expectedFailure = _profile.Status != HttpStatusCode.OK ? nameof(HttpRequestException)
                : _profile.Body != "Object" ? nameof(JsonException) : null;
            Evidence.Require(_lastFailure == expectedFailure && (_lastTicket is not null) == (expectedFailure is null),
                "Actual ticket/JSON/status result must match the prespecified profile.");
            if (_cancellationMode == "AfterBuffer")
            {
                Evidence.Require(_aborted.IsCancellationRequested && _lastTicket is not null, "Observe the actual legacy after-buffer ticket result with caller cancellation requested.");
            }
        }
        var contract = new
        {
            shape = _profile.Name, phase, cancellationMode = _cancellationMode, result, success = _lastTicket is not null,
            failure = _lastFailure, name = _lastTicket?.Principal.Identity?.Name,
            identifier = _lastTicket?.Principal.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            givenName = _lastTicket?.Principal.FindFirst(ClaimTypes.GivenName)?.Value,
            surname = _lastTicket?.Principal.FindFirst(ClaimTypes.Surname)?.Value,
            email = _lastTicket?.Principal.FindFirst(ClaimTypes.Email)?.Value,
            creatingTicketCalls = _eventCalls, payloadDocumentDisposed = documentDisposed,
            payloadBytes = _producer.PayloadBytes, serializedBytes = _producer.SerializedBytes, requestDelta = _requestDelta,
            responseDisposed = _producer.ResponseDisposed, requestMethod = _producer.LastMethod,
            authorization = _producer.LastAuthorization, endpoint = _producer.LastRequestUri?.AbsoluteUri,
            callerCancellationRequested = _aborted.IsCancellationRequested, allAssertionsPassed = true,
        };
        Evidence.Write("contract", contract);

        return contract;
    }

    public void Dispose()
    {
        _producer.DisposeRequestResponse();
        _tokens.Dispose();
        _client.Dispose();
        _services.Dispose();
        _aborted.Dispose();
    }

    private sealed class ExposedGoogleHandler(IOptionsMonitor<GoogleOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : GoogleHandler(options, logger, encoder)
    {
        public Task<AuthenticationTicket> Create(ClaimsIdentity identity, AuthenticationProperties properties, OAuthTokenResponse tokens)
        {
            return base.CreateTicketAsync(identity, properties, tokens);
        }
    }
}

internal sealed class BackchannelProducer(byte[] payload, string? charset, HttpStatusCode status,
    CancellationTokenSource aborted, string? cancellationMode) : HttpMessageHandler
{
    private HttpRequestMessage? _request;
    private HttpResponseMessage? _response;
    private ProducedContent? _content;
    public int Requests { get; private set; }
    public int PayloadBytes => payload.Length;
    public int SerializedBytes => _content?.SerializedBytes ?? 0;
    public bool ResponseDisposed => _content?.Disposed ?? false;
    public Uri? LastRequestUri { get; private set; }
    public string? LastAuthorization { get; private set; }
    public string? LastMethod { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        Requests++;
        _request = request;
        LastRequestUri = request.RequestUri ?? throw new InvalidOperationException("Actual backchannel request URI required.");
        LastAuthorization = request.Headers.Authorization?.ToString();
        LastMethod = request.Method.Method;
        _content = new ProducedContent(payload, aborted, cancellationMode);
        _content.Headers.ContentType = new MediaTypeHeaderValue("application/json") { CharSet = charset };
        _response = new HttpResponseMessage(status) { Content = _content };

        return Task.FromResult(_response);
    }

    public void DisposeRequestResponse()
    {
        _response?.Dispose();
        _request?.Dispose();
    }

    private sealed class ProducedContent(byte[] bytes, CancellationTokenSource aborted, string? cancellationMode) : HttpContent
    {
        public int SerializedBytes { get; private set; }
        public bool Disposed { get; private set; }

        protected override bool TryComputeLength(out long length)
        {
            length = bytes.Length;

            return true;
        }

        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context)
        {
            return SerializeToStreamAsync(stream, context, CancellationToken.None);
        }

        protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context, CancellationToken cancellationToken)
        {
            if (cancellationMode == "DuringBuffer")
            {
                aborted.Cancel();
            }
            await stream.WriteAsync(bytes, cancellationToken);
            SerializedBytes = bytes.Length;
            if (cancellationMode == "AfterBuffer")
            {
                aborted.Cancel();
            }
        }

        protected override void Dispose(bool disposing)
        {
            Disposed = true;
            base.Dispose(disposing);
        }
    }
}
