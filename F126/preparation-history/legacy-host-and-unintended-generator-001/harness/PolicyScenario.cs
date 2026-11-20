// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Net;
using System.Text.Json;
using CustomPolicyProvider;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AutoPerf;

internal sealed record PolicyProfile(string Name, string Path, string PolicyName, int ExpectedAge);

internal sealed class ForwardingPolicyProvider(IAuthorizationPolicyProvider inner, bool forceDisabled) : IAuthorizationPolicyProvider
{
    private long _namedCalls;
    private long _defaultCalls;
    private long _fallbackCalls;
    internal IAuthorizationPolicyProvider Inner { get; } = inner;
    internal long NamedCalls => Interlocked.Read(ref _namedCalls);
    public bool AllowsCachingPolicies => !forceDisabled && Inner.AllowsCachingPolicies;

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        Interlocked.Increment(ref _namedCalls);

        return Inner.GetPolicyAsync(policyName);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync()
    {
        Interlocked.Increment(ref _defaultCalls);

        return Inner.GetDefaultPolicyAsync();
    }

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync()
    {
        Interlocked.Increment(ref _fallbackCalls);

        return Inner.GetFallbackPolicyAsync();
    }

    internal object Counts() => new
    {
        actualNamedCalls = NamedCalls, actualDefaultCalls = Interlocked.Read(ref _defaultCalls),
        actualFallbackCalls = Interlocked.Read(ref _fallbackCalls), actualForwardedOwnerFlag = Inner.AllowsCachingPolicies,
        actualEffectiveFlag = AllowsCachingPolicies, actualControlForcesFlagFalse = forceDisabled,
        actualOwnerType = Inner.GetType().FullName
    };
}

internal sealed class SampleHost : IDisposable
{
    private readonly TestServer _server;
    private readonly HttpClient _client;
    internal IServiceProvider Services => _server.Services;
    internal ForwardingPolicyProvider Provider { get; }

    private SampleHost(TestServer server)
    {
        _server = server;
        _client = server.CreateClient();
        _client.BaseAddress = new Uri("http://localhost");
        Provider = (ForwardingPolicyProvider)Services.GetRequiredService<IAuthorizationPolicyProvider>();
        Evidence.Require(Provider.Inner.GetType().Assembly == typeof(Startup).Assembly
            && Provider.Inner.GetType().FullName == "CustomPolicyProvider.MinimumAgePolicyProvider",
            "Require the actual Startup-registered sample owner, not a copied implementation.");
    }

    internal static SampleHost Create(bool forceDisabled, Action<AuthorizationOptions>? configureOptions = null)
    {
        var builder = new WebHostBuilder()
            .UseSetting(WebHostDefaults.ApplicationKey, typeof(Startup).Assembly.GetName().Name)
            .UseContentRoot(System.IO.Path.Combine(Evidence.SourceRoot, "src", "Security", "samples", "CustomPolicyProvider"))
            .ConfigureLogging(logging => logging.ClearProviders().SetMinimumLevel(LogLevel.None))
            .UseStartup<Startup>()
            .ConfigureTestServices(services =>
            {
                var registration = services.Single(descriptor => descriptor.ServiceType == typeof(IAuthorizationPolicyProvider));
                var providerType = registration.ImplementationType
                    ?? throw new InvalidOperationException("Require the real sample's implementation-type registration.");
                services.Remove(registration);
                services.AddSingleton(serviceProvider => (IAuthorizationPolicyProvider)new ForwardingPolicyProvider(
                    (IAuthorizationPolicyProvider)ActivatorUtilities.CreateInstance(serviceProvider, providerType), forceDisabled));
                services.AddDataProtection().UseEphemeralDataProtectionProvider();
                if (configureOptions is not null)
                {
                    services.Configure(configureOptions);
                }
            });

        return new SampleHost(new TestServer(builder));
    }

    internal async Task<int> RequestAsync(string path)
    {
        using var response = await _client.GetAsync(path).ConfigureAwait(false);

        return (int)response.StatusCode;
    }

    internal async Task<object> VerifyRedirectAsync(PolicyProfile profile)
    {
        using var response = await _client.GetAsync(profile.Path).ConfigureAwait(false);
        var location = response.Headers.Location?.OriginalString;
        Evidence.Require(response.StatusCode == HttpStatusCode.Redirect
            && location == $"http://localhost/account/signin?ReturnUrl=%2FHome%2F{profile.Name}",
            "Require the actual routed cookie challenge and exact original location.");

        return new { actualStatus = (int)response.StatusCode, actualLocation = location };
    }

    public void Dispose()
    {
        _client.Dispose();
        _server.Dispose();
    }
}

internal sealed class PolicyScenario(PolicyProfile profile, SampleHost primary, SampleHost disabled) : IDisposable
{
    private static readonly Dictionary<string, PolicyScenario> Prepared = new(StringComparer.Ordinal);
    private static PolicyProfile[]? _profiles;
    internal PolicyProfile Profile { get; } = profile;
    internal SampleHost Primary { get; } = primary;
    internal SampleHost Disabled { get; } = disabled;
    internal object? PrimaryWarmResult { get; private set; }
    internal object? DisabledWarmResult { get; private set; }
    internal static IReadOnlyList<PolicyProfile> Profiles
    {
        get
        {
            if (_profiles is null)
            {
                using var document = JsonDocument.Parse(File.ReadAllBytes(System.IO.Path.Combine(AppContext.BaseDirectory, "profile-definitions.json")));
                _profiles = JsonSerializer.Deserialize<PolicyProfile[]>(document.RootElement.GetProperty("profiles").GetRawText())
                    ?? throw new InvalidOperationException("Require the sealed real-route profiles.");
                Evidence.Require(_profiles.Length == 2 && _profiles.Select(item => item.Name).SequenceEqual(["MinimumAge10", "MinimumAge50"]),
                    "Require exactly the two predeclared actual sample routes.");
            }

            return _profiles;
        }
    }

    internal static async Task PrepareAsync()
    {
        Evidence.Require(Prepared.Count == 0, "Never prepare duplicate server lifetimes.");
        foreach (var profile in Profiles)
        {
            var primary = SampleHost.Create(forceDisabled: false);
            SampleHost disabled;
            try
            {
                disabled = SampleHost.Create(forceDisabled: true);
            }
            catch
            {
                primary.Dispose();
                throw;
            }
            var scenario = new PolicyScenario(profile, primary, disabled);
            Prepared.Add(profile.Name, scenario);
            scenario.PrimaryWarmResult = await primary.VerifyRedirectAsync(profile).ConfigureAwait(false);
            scenario.DisabledWarmResult = await disabled.VerifyRedirectAsync(profile).ConfigureAwait(false);
            Evidence.Require(primary.Provider.NamedCalls == 1 && disabled.Provider.NamedCalls == 1,
                "Each fresh actual sample endpoint must construct its policy on its first request.");
        }
        Evidence.Write("prepared-real-hosts", new
        {
            actualHosts = Prepared.Count * 2, actualPrimaryFlagForwarded = true,
            actualMatchedControlForcesFalse = true, actualAsyncPreparationCompletedBeforeBdn = true,
            actualLoggingDisabled = true, actualEphemeralDataProtection = true
        });
    }

    internal static PolicyScenario Get(string profile) => Prepared[profile];

    internal static void DisposeAll()
    {
        foreach (var scenario in Prepared.Values)
        {
            scenario.Dispose();
        }
    }

    public void Dispose()
    {
        Primary.Dispose();
        Disabled.Dispose();
    }
}
