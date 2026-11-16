using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

[MemoryDiagnoser]
public class GoogleChallengeBenchmark
{
    public static string[] Profiles { get; } =
    [
        "TypedTrue", "TypedFalse", "TypedTrueNoPkce", "TypedFalseNoPkce",
        "TrueOverridesItem", "FalseOverridesItem", "TypedNull", "Absent",
        "ItemTrue", "ItemFalse", "ItemVerbatim", "NullKeepsItem", "EndpointDefault",
    ];

    private const string Callback = "https://app.example.test/signin-google";
    private const string ReturnUri = "https://app.example.test/complete?value=a%20b&part=%23";
    private const string Payload = "preserved + / ? % # \u2603";
    private ServiceProvider _services = null!;
    private IServiceScope _ownerScope = null!;
    private PreparedGoogleHandler _owner = null!;
    private PropertiesDataFormat _stateFormat = null!;
    private bool _pkce;
    private string? _expectedInclude;
    private bool? _typedValue;
    private string? _itemValue;
    private bool _setTypedNull;

    [ParamsSource(nameof(Profiles))]
    public string Profile { get; set; } = null!;

    [GlobalSetup(Target = nameof(PreparedOwner))]
    public void SetupPrepared() => Prepare(nameof(PreparedOwner));

    [GlobalSetup(Target = nameof(PublicChallenge))]
    public void SetupPublic() => Prepare(nameof(PublicChallenge));

    public void Prepare(string method)
    {
        _pkce = Profile is not "TypedTrueNoPkce" and not "TypedFalseNoPkce";
        _typedValue = Profile switch
        {
            "TypedTrue" or "TypedTrueNoPkce" or "TrueOverridesItem" => true,
            "TypedFalse" or "TypedFalseNoPkce" or "FalseOverridesItem" => false,
            _ => null,
        };
        _setTypedNull = Profile is "TypedNull" or "NullKeepsItem";
        _itemValue = Profile switch
        {
            "TrueOverridesItem" or "ItemFalse" => "false",
            "FalseOverridesItem" or "ItemTrue" => "true",
            "ItemVerbatim" or "NullKeepsItem" => "MiXeD + / ? % \u2603",
            _ => null,
        };
        _expectedInclude = Profile switch
        {
            "TypedTrue" or "TypedTrueNoPkce" or "TrueOverridesItem" => "true",
            "TypedFalse" or "TypedFalseNoPkce" or "FalseOverridesItem" => "false",
            "EndpointDefault" => "endpoint-default",
            _ => _itemValue,
        };
        Check(Profiles.Contains(Profile), "Unknown profile.");
        _stateFormat = new PropertiesDataFormat(
            new EphemeralDataProtectionProvider(NullLoggerFactory.Instance).CreateProtector("AutoPerf.F091"));
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthentication(options => options.DefaultSignInScheme = "Cookie")
            .AddCookie("Cookie")
            .AddGoogle(options =>
            {
                options.ClientId = "benchmark-placeholder-id";
                options.ClientSecret = "benchmark-placeholder-not-a-credential";
                options.StateDataFormat = _stateFormat;
                options.UsePkce = _pkce;
                if (Profile == "EndpointDefault")
                {
                    options.AuthorizationEndpoint += "?include_granted_scopes=endpoint-default&source=retained";
                }
            });
        _services = services.BuildServiceProvider();
        _ownerScope = _services.CreateScope();
        var ownerContext = NewContext(_ownerScope.ServiceProvider);
        var scheme = _services.GetRequiredService<IAuthenticationSchemeProvider>()
            .GetSchemeAsync(GoogleDefaults.AuthenticationScheme).GetAwaiter().GetResult()
            ?? throw new InvalidOperationException("Real registered Google scheme absent.");
        _owner = new PreparedGoogleHandler(
            _services.GetRequiredService<IOptionsMonitor<GoogleOptions>>(),
            _services.GetRequiredService<ILoggerFactory>(), UrlEncoder.Default);
        _owner.InitializeAsync(scheme, ownerContext).GetAwaiter().GetResult();

        var captures = new List<object>();
        for (var attempt = 0; attempt < 2; attempt++)
        {
            if (method == nameof(PreparedOwner))
            {
                var properties = NewProperties();
                var url = _owner.InvokeActualOwner(properties, Callback);
                captures.Add(Validate(url, properties, false));
            }
            else
            {
                using var scope = _services.CreateScope();
                var context = NewContext(scope.ServiceProvider);
                var properties = NewProperties();
                context.ChallengeAsync(GoogleDefaults.AuthenticationScheme, properties).GetAwaiter().GetResult();
                Check(context.Response.StatusCode == StatusCodes.Status302Found, "Actual public challenge did not redirect.");
                var registered = scope.ServiceProvider.GetRequiredService<IAuthenticationHandlerProvider>()
                    .GetHandlerAsync(context, GoogleDefaults.AuthenticationScheme).GetAwaiter().GetResult();
                Check(registered?.GetType() == typeof(GoogleHandler), "Public challenge did not use the registered actual Google handler.");
                captures.Add(Validate(context.Response.Headers.Location.ToString(), properties, true));
            }
        }
        var assembly = typeof(GoogleHandler).Assembly;
        var ownerHash = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location)));
        var stateDirectory = Environment.GetEnvironmentVariable("AUTOPERF_F091_STATE_DIR")
            ?? throw new InvalidOperationException("An explicit actual setup-state directory is required.");
        Directory.CreateDirectory(stateDirectory);
        var receipt = new
        {
            Profile, method, ownerType = typeof(GoogleHandler).FullName,
            ownerSha256 = ownerHash, ownerMvid = assembly.ManifestModule.ModuleVersionId,
            ownerLocation = assembly.Location, pkce = _pkce, expectedInclude = _expectedInclude,
            typedValue = _typedValue, itemValue = _itemValue,
            realPropertiesDataFormat = true, persistentKeyStoreUsed = false,
            captures,
        };
        File.WriteAllText(Path.Combine(stateDirectory, $"{Profile}-{method}-{Guid.NewGuid():N}.json"),
            JsonSerializer.Serialize(receipt, new JsonSerializerOptions { WriteIndented = true }));
        Console.WriteLine($"AUTOPERF_F091_OWNER:{Profile}/{method}:{ownerHash}");
    }

    [Benchmark]
    public int PreparedOwner()
    {
        var url = _owner.InvokeActualOwner(NewProperties(), Callback);
        return url.Length;
    }

    [Benchmark]
    public async Task<int> PublicChallenge()
    {
        using var scope = _services.CreateScope();
        var context = NewContext(scope.ServiceProvider);
        await context.ChallengeAsync(GoogleDefaults.AuthenticationScheme, NewProperties());
        return context.Response.Headers.Location.ToString().Length;
    }

    private GoogleChallengeProperties NewProperties()
    {
        var properties = new GoogleChallengeProperties
        {
            RedirectUri = ReturnUri,
        };
        properties.Items["payload"] = Payload;
        if (_itemValue is not null)
        {
            properties.Items[GoogleChallengeProperties.IncludeGrantedScopesKey] = _itemValue;
        }
        if (_typedValue.HasValue || _setTypedNull)
        {
            properties.IncludeGrantedScopes = _typedValue;
        }
        return properties;
    }

    private static DefaultHttpContext NewContext(IServiceProvider services)
    {
        var context = new DefaultHttpContext { RequestServices = services };
        context.Request.Scheme = "https";
        context.Request.Host = new HostString("app.example.test");
        context.Request.Path = "/challenge";
        return context;
    }

    private object Validate(string url, AuthenticationProperties properties, bool publicChallenge)
    {
        var uri = new Uri(url);
        Check(uri.GetLeftPart(UriPartial.Path) == GoogleDefaults.AuthorizationEndpoint, "Authorization endpoint changed.");
        var query = QueryHelpers.ParseQuery(uri.Query);
        Check(query["client_id"] == "benchmark-placeholder-id", "Client identifier changed.");
        Check(query["response_type"] == "code", "Response type changed.");
        Check(query["redirect_uri"] == Callback, "Callback changed.");
        Check(query["scope"] == "openid profile email", "Default scope changed.");
        if (_expectedInclude is null)
        {
            Check(!query.ContainsKey(GoogleChallengeProperties.IncludeGrantedScopesKey), "Absent nullable parameter was emitted.");
        }
        else
        {
            var values = query[GoogleChallengeProperties.IncludeGrantedScopesKey];
            var expectedCount = Profile == "EndpointDefault" ? 2 : 1;
            Check(values.Count == expectedCount && values.All(value => value == _expectedInclude),
                "Typed/Items/endpoint precedence or exact lowercase/verbatim text changed.");
        }
        Check(!properties.Items.ContainsKey(GoogleChallengeProperties.IncludeGrantedScopesKey), "Consumed item remained on input properties.");
        var state = _stateFormat.Unprotect(query["state"].ToString())
            ?? throw new InvalidOperationException("Actual protected state did not round-trip.");
        Check(state.RedirectUri == ReturnUri && state.Items["payload"] == Payload, "Actual state payload or return URI changed.");
        Check(!state.Items.ContainsKey(GoogleChallengeProperties.IncludeGrantedScopesKey), "Consumed item leaked into protected state.");
        Check(query.ContainsKey("code_challenge") == _pkce, "PKCE query presence changed.");
        if (_pkce)
        {
            Check(query["code_challenge_method"] == "S256", "PKCE method changed.");
            Check(state.Items.ContainsKey("code_verifier"), "Actual PKCE producer did not preserve its verifier.");
            var expectedChallenge = WebEncoders.Base64UrlEncode(
                SHA256.HashData(Encoding.UTF8.GetBytes(state.Items["code_verifier"]!)));
            Check(query["code_challenge"] == expectedChallenge, "Actual PKCE verifier/challenge relationship changed.");
        }
        if (Profile == "EndpointDefault")
        {
            Check(query["source"].Count == 2 && query["source"].All(value => value == "retained"),
                "Existing endpoint query repetition changed.");
        }
        var expectedQueryKeys = new List<string> { "client_id", "scope", "response_type", "redirect_uri", "state" };
        if (_expectedInclude is not null)
        {
            expectedQueryKeys.Add(GoogleChallengeProperties.IncludeGrantedScopesKey);
        }
        if (_pkce)
        {
            expectedQueryKeys.AddRange(["code_challenge", "code_challenge_method"]);
        }
        if (Profile == "EndpointDefault")
        {
            expectedQueryKeys.Add("source");
        }
        Check(query.Keys.Order(StringComparer.Ordinal).SequenceEqual(expectedQueryKeys.Order(StringComparer.Ordinal)),
            "Complete query key set changed.");
        var expectedStateKeys = new List<string> { ".redirect", "payload" };
        if (_pkce)
        {
            expectedStateKeys.Add("code_verifier");
        }
        if (publicChallenge)
        {
            expectedStateKeys.Add(".xsrf");
            Check(!string.IsNullOrEmpty(state.Items[".xsrf"]), "Actual public challenge did not produce its state identifier.");
        }
        Check(state.Items.Keys.Order(StringComparer.Ordinal).SequenceEqual(expectedStateKeys.Order(StringComparer.Ordinal)),
            "Complete real protected-state key set changed.");
        var stableQuery = query.Where(item => item.Key is not "state" and not "code_challenge")
            .ToDictionary(item => item.Key, item => item.Value.ToString(), StringComparer.Ordinal);
        return new
        {
            publicChallenge, stableQuery,
            protectedStateRoundTrip = true, consumedItemRemoved = true,
            stateItemKeys = state.Items.Keys.Order(StringComparer.Ordinal).ToArray(),
            payloadPreserved = true, returnUriPreserved = true, generatedPkce = _pkce,
            completeQueryAndStateChecked = true, pkceRelationChecked = _pkce,
        };
    }

    private static void Check(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _ownerScope?.Dispose();
        _services?.Dispose();
    }

    private sealed class PreparedGoogleHandler(
        IOptionsMonitor<GoogleOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : GoogleHandler(options, logger, encoder)
    {
        public string InvokeActualOwner(AuthenticationProperties properties, string redirectUri)
            => base.BuildChallengeUrl(properties, redirectUri);
    }
}
