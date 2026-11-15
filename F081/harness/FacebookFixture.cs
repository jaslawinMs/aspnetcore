using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AutoPerf;

internal sealed record FacebookProfile(string Name, int Padding = 0, string EncodingName = "utf-8",
    string? Charset = "utf-8", bool Bom = false, bool UnicodePadding = false,
    bool InvalidUtf8 = false, string Body = "Object", HttpStatusCode Status = HttpStatusCode.OK);

internal static class FacebookProfiles
{
    public static readonly FacebookProfile[] All =
    [
        new("Utf8Small"),
        new("Utf8Typical1K", 1024),
        new("Utf8Large16K", 16384),
        new("Utf8Large64K", 65536),
        new("Utf8Unicode16K", 16384, UnicodePadding: true),
        new("Utf8Bom16K", 16384, Bom: true),
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
        new("EmptyJsonControl", Body: "Empty"),
        new("TrailingJsonControl", Body: "Trailing"),
        new("MalformedJsonControl", Body: "Malformed"),
        new("FailedHttpControl", Status: HttpStatusCode.BadRequest),
    ];
}

internal sealed class FacebookFixture : IDisposable
{
    private readonly FacebookProfile _profile;
    private readonly string? _cancellationMode;
    private readonly CancellationTokenSource _aborted = new();
    private readonly ServiceProvider _services;
    private readonly BackchannelProducer _producer;
    private readonly HttpClient _client;
    private readonly ExposedFacebookHandler _owner;
    private readonly OAuthTokenResponse _tokens;
    private readonly string _expectedName;
    private bool _capture;
    private JsonElement _capturedPayload;
    private int _eventCalls;
    private AuthenticationTicket? _lastTicket;
    private string? _lastFailure;

    public FacebookFixture(FacebookProfile profile, string? cancellationMode = null)
    {
        _profile = profile;
        _cancellationMode = cancellationMode;
        var padding = new string(profile.UnicodePadding ? '\u00E9' : 'x', profile.Padding);
        var body = profile.Body switch
        {
            "Empty" => "",
            "Trailing" => "{} {}",
            "Malformed" => "{\"name\":",
            _ => "{\"id\":\"profile-id\",\"name\":\"caf\u00E9 \\u03A9 \\ud83d\\ude00\\nname\",\"padding\":\"" + padding + "\"}",
        };
        var encoding = Encoding.GetEncoding(profile.EncodingName);
        var bytes = encoding.GetBytes(body);
        if (profile.Bom)
        {
            bytes = [.. encoding.GetPreamble(), .. bytes];
        }
        _expectedName = profile.InvalidUtf8 ? "caf\uFFFD \u03A9 \U0001F600\nname" : "caf\u00E9 \u03A9 \U0001F600\nname";
        _producer = new BackchannelProducer(bytes, profile.Charset, profile.Status, _aborted, cancellationMode);
        _client = new HttpClient(_producer);
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthentication().AddFacebook(options =>
        {
            options.AppId = "benchmark-app";
            options.AppSecret = "benchmark-placeholder";
            options.Backchannel = _client;
            options.Events = new OAuthEvents
            {
                OnCreatingTicket = context =>
                {
                    if (_capture)
                    {
                        _eventCalls++;
                        _capturedPayload = context.User;
                        if (context.User.GetProperty("name").GetString() != _expectedName ||
                            context.User.GetProperty("padding").GetString() != padding)
                        {
                            throw new InvalidOperationException("Actual CreatingTicket JSON must preserve name/padding.");
                        }
                    }
                    return Task.CompletedTask;
                }
            };
        });
        services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider(NullLoggerFactory.Instance));
        _services = services.BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = _services };
        context.Request.Scheme = "https";
        context.Request.Host = new HostString("app.example");
        context.RequestAborted = _aborted.Token;
        _owner = new ExposedFacebookHandler(_services.GetRequiredService<IOptionsMonitor<FacebookOptions>>(),
            NullLoggerFactory.Instance, UrlEncoder.Default);
        _owner.InitializeAsync(new AuthenticationScheme(FacebookDefaults.AuthenticationScheme, null, typeof(FacebookHandler)), context)
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
        try
        {
            var ticket = await _owner.Create(new ClaimsIdentity(FacebookDefaults.AuthenticationScheme), new AuthenticationProperties(), _tokens);
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
            _producer.DisposeResponse();
        }
    }

    public async Task<object> CaptureContract()
    {
        _capture = true;
        _eventCalls = 0;
        _capturedPayload = default;
        var result = await Exercise();
        _capture = false;
        var documentDisposed = false;
        if (_lastTicket is not null)
        {
            if (_lastTicket.Principal.Identity?.Name != _expectedName ||
                _lastTicket.Principal.FindFirst(ClaimTypes.NameIdentifier)?.Value != "profile-id" ||
                _eventCalls != 1)
            {
                throw new InvalidOperationException("Actual owner must produce the expected ticket claims exactly once.");
            }
            try
            {
                _capturedPayload.GetProperty("id");
            }
            catch (ObjectDisposedException)
            {
                documentDisposed = true;
            }
            if (!documentDisposed)
            {
                throw new InvalidOperationException("Actual owner must dispose its payload after CreatingTicket.");
            }
        }
        else if (_eventCalls != 0)
        {
            throw new InvalidOperationException("No CreatingTicket event is allowed after parse/status/cancellation failure.");
        }
        if (_producer.LastRequestUri is Uri uri)
        {
            var endpoint = uri.GetComponents(UriComponents.SchemeAndServer | UriComponents.Path, UriFormat.UriEscaped);
            var query = QueryHelpers.ParseQuery(uri.Query);
            if (endpoint != FacebookDefaults.UserInformationEndpoint || query["access_token"] != "benchmark-token" ||
                !query.ContainsKey("fields") || !query.ContainsKey("appsecret_proof"))
            {
                throw new InvalidOperationException("Actual owner must produce the Facebook endpoint and token/fields/proof query.");
            }
        }
        if (_cancellationMode is null)
        {
            if (_profile.Status != HttpStatusCode.OK && _lastFailure != nameof(HttpRequestException) ||
                _profile.Status == HttpStatusCode.OK && _profile.Body != "Object" && _lastFailure != nameof(JsonException) ||
                _profile.Status == HttpStatusCode.OK && _profile.Body == "Object" && _lastTicket is null)
            {
                throw new InvalidOperationException("Profile did not reach its expected success/error material effect.");
            }
            if (_producer.SerializedBytes != _producer.PayloadBytes || !_producer.ResponseDisposed)
            {
                throw new InvalidOperationException("Actual HttpClient.GetAsync must buffer all bytes and response cleanup must complete.");
            }
        }
        return new {
            result,
            success = _lastTicket is not null,
            failure = _lastFailure,
            name = _lastTicket?.Principal.Identity?.Name,
            identifier = _lastTicket?.Principal.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            creating_ticket_calls = _eventCalls,
            payload_document_disposed = documentDisposed,
            payload_bytes = _producer.PayloadBytes,
            serialized_bytes = _producer.SerializedBytes,
            response_disposed = _producer.ResponseDisposed,
            real_request_query = _producer.LastRequestUri?.Query,
            caller_cancellation_requested = _aborted.IsCancellationRequested,
        };
    }

    public void Dispose()
    {
        _producer.DisposeResponse();
        _tokens.Dispose();
        _client.Dispose();
        _services.Dispose();
        _aborted.Dispose();
    }

    private sealed class ExposedFacebookHandler(IOptionsMonitor<FacebookOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : FacebookHandler(options, logger, encoder)
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
    private HttpResponseMessage? _response;
    private ProducedContent? _content;
    public int PayloadBytes => payload.Length;
    public int SerializedBytes => _content?.SerializedBytes ?? 0;
    public bool ResponseDisposed => _content?.Disposed ?? false;
    public Uri? LastRequestUri { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        LastRequestUri = request.RequestUri ?? throw new InvalidOperationException("Real backchannel request URI required.");
        _content = new ProducedContent(payload, aborted, cancellationMode);
        _content.Headers.ContentType = new MediaTypeHeaderValue("application/json") { CharSet = charset };
        _response = new HttpResponseMessage(status) { Content = _content };
        return Task.FromResult(_response);
    }

    public void DisposeResponse()
    {
        _response?.Dispose();
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
