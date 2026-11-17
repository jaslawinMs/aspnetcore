using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AutoPerf;

internal static class SignInProfiles
{
    public static readonly string[] All =
    [
        "Default.One.Hit",
        "Default.Four.Tail",
        "Default.Many.Tail",
        "Default.Many.Miss",
        "Default.Many.Hidden",
        "Default.Many.Head",
        "Default.Empty.Miss",
        "DerivedManager.Four.Tail",
        "DerivedProvider.Four.Tail",
        "Early.NoAuthentication",
    ];

    public static readonly string[] FirstObserved = ["Default.Four.Tail", "DerivedManager.Four.Tail"];
}

internal sealed class SignInFixture : IDisposable
{
    private readonly ServiceProvider _services;
    private readonly UserManager<BenchmarkUser> _users;
    private readonly string _profile;
    private readonly string _expectedDisplayName;
    private readonly int _schemeCount;

    public SignInFixture(string profile, IAuthenticationSchemeProvider? schemes = null,
        Func<Task<IEnumerable<AuthenticationScheme>>>? externalSchemes = null)
    {
        Evidence.Require(SignInProfiles.All.Contains(profile, StringComparer.Ordinal), "Unknown actual public profile:" + profile);
        _profile = profile;
        _schemeCount = profile.Contains(".Many.", StringComparison.Ordinal) ? 128
            : profile.Contains(".Empty.", StringComparison.Ordinal) ? 0
            : profile.Contains(".One.", StringComparison.Ordinal) ? 1 : 4;
        var index = profile.EndsWith(".Head", StringComparison.Ordinal) ? 0 : _schemeCount - 1;
        var missing = profile.EndsWith(".Miss", StringComparison.Ordinal);
        var registeredName = missing ? "scheme.unknown" : $"scheme.{index}";
        ProviderName = new string(registeredName.AsSpan());
        var hidden = profile.EndsWith(".Hidden", StringComparison.Ordinal);
        _expectedDisplayName = missing || hidden ? ProviderName : $"Display {index}";
        var options = new AuthenticationOptions();
        for (var item = 0; item < _schemeCount; item++)
        {
            var display = hidden && item == index ? null : $"Display {item}";
            options.AddScheme($"scheme.{item}", scheme =>
            {
                scheme.DisplayName = display;
                scheme.HandlerType = typeof(UnusedAuthenticationHandler);
            });
        }
        Schemes = schemes ?? (profile.StartsWith("DerivedProvider.", StringComparison.Ordinal)
            ? new DerivedSchemeProvider(Options.Create(options))
            : new AuthenticationSchemeProvider(Options.Create(options)));
        Principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "key")]));
        Properties = new AuthenticationProperties();
        Properties.Items["LoginProvider"] = ProviderName;
        Properties.StoreTokens([new AuthenticationToken { Name = "sample", Value = "synthetic-value" }]);
        SuccessfulAuthentication = AuthenticateResult.Success(
            new AuthenticationTicket(Principal, Properties, IdentityConstants.ExternalScheme));
        Context = new DefaultHttpContext();
        Authentication = new PreparedAuthenticationService(Context, profile == "Early.NoAuthentication"
            ? AuthenticateResult.NoResult() : SuccessfulAuthentication);
        _services = new ServiceCollection().AddSingleton<IAuthenticationService>(Authentication).BuildServiceProvider();
        Context.RequestServices = _services;
        var identityOptions = Options.Create(new IdentityOptions());
        _users = new UserManager<BenchmarkUser>(new UnusedUserStore(), identityOptions, new PasswordHasher<BenchmarkUser>(),
            [], [], new UpperInvariantLookupNormalizer(), new IdentityErrorDescriber(), _services,
            NullLogger<UserManager<BenchmarkUser>>.Instance);
        Manager = externalSchemes is not null
            ? new OverrideSignInManager(_users, identityOptions, Schemes, externalSchemes)
            : profile.StartsWith("DerivedManager.", StringComparison.Ordinal)
                ? new DerivedSignInManager(_users, identityOptions, Schemes)
                : new SignInManager<BenchmarkUser>(_users, new HttpContextAccessor(), new UnusedClaimsFactory(),
                    identityOptions, NullLogger<SignInManager<BenchmarkUser>>.Instance, Schemes,
                    new DefaultUserConfirmation<BenchmarkUser>());
        Manager.Context = Context;
    }

    public string ProviderName { get; }
    public ClaimsPrincipal Principal { get; }
    public AuthenticationProperties Properties { get; }
    public AuthenticateResult SuccessfulAuthentication { get; }
    public DefaultHttpContext Context { get; }
    public PreparedAuthenticationService Authentication { get; }
    public IAuthenticationSchemeProvider Schemes { get; }
    public SignInManager<BenchmarkUser> Manager { get; }
    public int ExpectedConsumption => _profile == "Early.NoAuthentication" ? 0 : _expectedDisplayName.Length;

    public async Task<int> ExerciseAsync()
    {
        var result = await Manager.GetExternalLoginInfoAsync();

        return result?.ProviderDisplayName?.Length ?? 0;
    }

    public void CaptureContract(string phase)
    {
        var before = Authentication.Calls;
        var operation = Manager.GetExternalLoginInfoAsync();
        Evidence.Require(operation.IsCompletedSuccessfully, "The prepared profile unexpectedly yielded.");
        var result = operation.GetAwaiter().GetResult();
        Evidence.Require(Authentication.Calls == before + 1, "The actual public authentication-service producer was bypassed.");
        if (_profile == "Early.NoAuthentication")
        {
            Evidence.Require(result is null, "The no-result profile must return no external login info.");
        }
        else
        {
            RequireResult(result, _expectedDisplayName);
        }
        Evidence.Write("public-profile-contract", new
        {
            profile = _profile, phase, actualSchemeCount = _schemeCount, lookupName = ProviderName,
            expectedDisplayName = _profile == "Early.NoAuthentication" ? null : _expectedDisplayName,
            actualDisplayName = result?.ProviderDisplayName,
            actualConsumedValue = result?.ProviderDisplayName?.Length ?? 0, expectedConsumedValue = ExpectedConsumption,
            actualManagerType = Manager.GetType().FullName, actualProviderType = Schemes.GetType().FullName,
            actualExactDefaultTypes = Manager.GetType() == typeof(SignInManager<BenchmarkUser>) &&
                Schemes.GetType() == typeof(AuthenticationSchemeProvider),
            actualAuthenticationCalls = Authentication.Calls,
            actualPublicContextAssignedEqually = ReferenceEquals(Manager.Context, Context),
            actualPropertiesReferencePreserved = result is null || ReferenceEquals(result.AuthenticationProperties, Properties),
            actualPrincipalReferencePreserved = result is null || ReferenceEquals(result.Principal, Principal),
            actualAllContractAssertionsPassed = true,
            boundary = "Actual public owner and real registered scheme collection;prepared authentication-result service,not a full login.",
        });
    }

    public void RequireResult(ExternalLoginInfo? result, string? displayName, string providerKey = "key")
    {
        Evidence.Require(result is not null, "Expected actual external login info.");
        Evidence.Require(result!.ProviderDisplayName == displayName && result.LoginProvider == ProviderName &&
            result.ProviderKey == providerKey, "Actual provider/display/key differs.");
        Evidence.Require(ReferenceEquals(result.Principal, Principal) &&
            ReferenceEquals(result.AuthenticationProperties, Properties), "Actual principal/properties references differ.");
        var token = result.AuthenticationTokens?.Single();
        Evidence.Require(token is { Name: "sample", Value: "synthetic-value" }, "Actual synthetic token differs.");
    }

    public void Dispose()
    {
        _users.Dispose();
        _services.Dispose();
    }

    private sealed class DerivedSchemeProvider(IOptions<AuthenticationOptions> options) : AuthenticationSchemeProvider(options);

    private sealed class UnusedUserStore : IUserStore<BenchmarkUser>
    {
        public void Dispose() { }
        public Task<string> GetUserIdAsync(BenchmarkUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<string?> GetUserNameAsync(BenchmarkUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task SetUserNameAsync(BenchmarkUser user, string? userName, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<string?> GetNormalizedUserNameAsync(BenchmarkUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task SetNormalizedUserNameAsync(BenchmarkUser user, string? normalizedName, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<IdentityResult> CreateAsync(BenchmarkUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<IdentityResult> UpdateAsync(BenchmarkUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<IdentityResult> DeleteAsync(BenchmarkUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<BenchmarkUser?> FindByIdAsync(string userId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<BenchmarkUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken) => throw new NotSupportedException();
    }

    private sealed class UnusedAuthenticationHandler : IAuthenticationHandler
    {
        public Task InitializeAsync(AuthenticationScheme scheme, HttpContext context) => throw new NotSupportedException();
        public Task<AuthenticateResult> AuthenticateAsync() => throw new NotSupportedException();
        public Task ChallengeAsync(AuthenticationProperties? properties) => throw new NotSupportedException();
        public Task ForbidAsync(AuthenticationProperties? properties) => throw new NotSupportedException();
    }
}

internal sealed class BenchmarkUser;

internal sealed class UnusedClaimsFactory : IUserClaimsPrincipalFactory<BenchmarkUser>
{
    public Task<ClaimsPrincipal> CreateAsync(BenchmarkUser user) => throw new NotSupportedException();
}

internal class DerivedSignInManager(
    UserManager<BenchmarkUser> users, IOptions<IdentityOptions> options, IAuthenticationSchemeProvider schemes)
    : SignInManager<BenchmarkUser>(users, new HttpContextAccessor(), new UnusedClaimsFactory(),
        options, NullLogger<SignInManager<BenchmarkUser>>.Instance, schemes, new DefaultUserConfirmation<BenchmarkUser>());

internal sealed class OverrideSignInManager(
    UserManager<BenchmarkUser> users, IOptions<IdentityOptions> options, IAuthenticationSchemeProvider schemes,
    Func<Task<IEnumerable<AuthenticationScheme>>> source) : DerivedSignInManager(users, options, schemes)
{
    public int OverrideCalls { get; private set; }

    public override Task<IEnumerable<AuthenticationScheme>> GetExternalAuthenticationSchemesAsync()
    {
        OverrideCalls++;

        return source();
    }
}

internal sealed class PreparedAuthenticationService(HttpContext expectedContext, AuthenticateResult result) : IAuthenticationService
{
    public Task<AuthenticateResult> ResultTask { get; set; } = Task.FromResult(result);
    public long Calls { get; private set; }

    public Task<AuthenticateResult> AuthenticateAsync(HttpContext context, string? scheme)
    {
        Evidence.Require(ReferenceEquals(context, expectedContext) && scheme == IdentityConstants.ExternalScheme,
            "The public owner requested an unexpected context/scheme.");
        Calls++;

        return ResultTask;
    }

    public Task ChallengeAsync(HttpContext context, string? scheme, AuthenticationProperties? properties) => throw new NotSupportedException();
    public Task ForbidAsync(HttpContext context, string? scheme, AuthenticationProperties? properties) => throw new NotSupportedException();
    public Task SignInAsync(HttpContext context, string? scheme, ClaimsPrincipal principal, AuthenticationProperties? properties) => throw new NotSupportedException();
    public Task SignOutAsync(HttpContext context, string? scheme, AuthenticationProperties? properties) => throw new NotSupportedException();
}
