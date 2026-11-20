// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Globalization;
using System.Reflection;
using System.Security.Claims;
using CustomPolicyProvider;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

internal static class Characterization
{
    internal static async Task RunAsync()
    {
        var actualProfiles = new List<object>();
        foreach (var profile in PolicyScenario.Profiles)
        {
            var scenario = PolicyScenario.Get(profile.Name);
            var primarySecond = await scenario.Primary.VerifyRedirectAsync(profile).ConfigureAwait(false);
            var disabledSecond = await scenario.Disabled.VerifyRedirectAsync(profile).ConfigureAwait(false);
            var actualFlag = scenario.Primary.Provider.Inner.AllowsCachingPolicies;
            Evidence.Require(actualFlag == (Evidence.Variant == "Candidate"), "Only the candidate sample opts into endpoint caching.");
            Evidence.Require(scenario.Primary.Provider.NamedCalls == (actualFlag ? 1 : 2)
                && scenario.Disabled.Provider.NamedCalls == 2 && !scenario.Disabled.Provider.AllowsCachingPolicies,
                "Require real MVC requests, the actual owner flag, and the explicit disabled-cache counterfactual.");
            var requestCounts = new
            {
                primary = scenario.Primary.Provider.Counts(), disabled = scenario.Disabled.Provider.Counts()
            };
            var endpoints = scenario.Primary.Services.GetRequiredService<EndpointDataSource>().Endpoints
                .Where(endpoint => endpoint.Metadata.GetMetadata<ControllerActionDescriptor>()?.ActionName == profile.Name).ToArray();
            Evidence.Require(endpoints.Length == 1, "Require the actual MVC-produced endpoint.");
            var descriptor = endpoints[0].Metadata.GetMetadata<ControllerActionDescriptor>()!;
            Evidence.Require(descriptor.ControllerTypeInfo.Assembly == typeof(Startup).Assembly
                && descriptor.ControllerName == "Home", "The endpoint must originate from the real sample controller.");
            var metadata = endpoints[0].Metadata.GetOrderedMetadata<IAuthorizeData>();
            Evidence.Require(metadata.Count == 1 && metadata[0].Policy == profile.PolicyName
                && metadata[0].GetType().Assembly == typeof(Startup).Assembly,
                "Require the real MinimumAgeAuthorizeAttribute-produced metadata.");
            var directFirst = await scenario.Primary.Provider.Inner.GetPolicyAsync(profile.PolicyName).ConfigureAwait(false);
            var directSecond = await scenario.Primary.Provider.Inner.GetPolicyAsync(profile.PolicyName).ConfigureAwait(false);
            Evidence.Require(directFirst is not null && directSecond is not null && !ReferenceEquals(directFirst, directSecond)
                && directFirst.Requirements.Count == 1 && directSecond.Requirements.Count == 1
                && Age(directFirst.Requirements[0]) == profile.ExpectedAge && Age(directSecond.Requirements[0]) == profile.ExpectedAge,
                "Direct actual-provider calls must keep constructing equivalent, uncached age policies.");
            var authorization = scenario.Primary.Services.GetRequiredService<IAuthorizationService>();
            var older = await authorization.AuthorizeAsync(Person(80), resource: null, directFirst!).ConfigureAwait(false);
            var younger = await authorization.AuthorizeAsync(Person(1), resource: null, directFirst!).ConfigureAwait(false);
            Evidence.Require(older.Succeeded && !younger.Succeeded, "The actual registered handler must evaluate different users independently.");
            actualProfiles.Add(new
            {
                profile.Name, profile.Path, profile.PolicyName, profile.ExpectedAge,
                actualPrimaryFirstResponse = scenario.PrimaryWarmResult, actualPrimarySecondResponse = primarySecond,
                actualDisabledFirstResponse = scenario.DisabledWarmResult, actualDisabledSecondResponse = disabledSecond,
                actualRequestCounts = requestCounts, actualEndpoint = endpoints[0].DisplayName,
                actualController = descriptor.ControllerTypeInfo.FullName, actualAction = descriptor.ActionName,
                actualMetadataType = metadata[0].GetType().FullName,
                actualDirectInstancesDiffer = !ReferenceEquals(directFirst, directSecond),
                actualDirectPolicy = Describe(directFirst), actualOlderSucceeds = older.Succeeded, actualYoungerSucceeds = younger.Succeeded
            });
        }
        var configuredNamed = new AuthorizationPolicyBuilder().RequireClaim("SampleNamed", "yes").Build();
        var configuredDefault = new AuthorizationPolicyBuilder().RequireClaim("SampleDefault", "yes").Build();
        var configuredFallback = new AuthorizationPolicyBuilder().RequireClaim("SampleFallback", "yes").Build();
        using var configured = await SampleHost.CreateAsync(forceDisabled: false, configureOptions: options =>
        {
            options.AddPolicy("ConfiguredByOptions", configuredNamed);
            options.AddPolicy("MinimumAgeNotAnInteger", configuredNamed);
            options.DefaultPolicy = configuredDefault;
            options.FallbackPolicy = configuredFallback;
        }).ConfigureAwait(false);
        var provider = configured.Provider.Inner;
        Evidence.Require(ReferenceEquals(await provider.GetPolicyAsync("ConfiguredByOptions").ConfigureAwait(false), configuredNamed)
            && ReferenceEquals(await provider.GetPolicyAsync("MinimumAgeNotAnInteger").ConfigureAwait(false), configuredNamed)
            && ReferenceEquals(await provider.GetDefaultPolicyAsync().ConfigureAwait(false), configuredDefault)
            && ReferenceEquals(await provider.GetFallbackPolicyAsync().ConfigureAwait(false), configuredFallback),
            "Configured named, malformed-name, default and fallback delegation must return the actual configured policies.");
        foreach (var name in new[] { "MinimumAge", "MinimumAgecat", "MinimumAge2147483648", "Missing" })
        {
            Evidence.Require(await provider.GetPolicyAsync(name).ConfigureAwait(false) is null,
                "Invalid/unknown unconfigured names must still follow the real fallback provider's null result.");
        }
        var current = CultureInfo.CurrentCulture;
        var currentUi = CultureInfo.CurrentUICulture;
        var cultures = new List<object>();
        try
        {
            foreach (var culture in new[] { "", "en-US", "tr-TR", "ar-SA", "sv-SE" })
            {
                CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo(culture);
                CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo(culture);
                var cases = new List<object>();
                foreach (var name in new[]
                {
                    "MinimumAge10", "minimumAGE50", "MinimumAge 10 ", "MinimumAge+10", "MinimumAge-1",
                    "MinimumAge2147483647", "MinimumAge-2147483648", "MinimumAge2147483648", "MinimumAgecat", "Missing"
                })
                {
                    var policy = await provider.GetPolicyAsync(name).ConfigureAwait(false);
                    if (name is "MinimumAge10" or "minimumAGE50")
                    {
                        Evidence.Require(policy is not null && policy.Requirements.Count == 1
                            && Age(policy.Requirements[0]) == (name == "MinimumAge10" ? 10 : 50),
                            "The actual sample's ordinary names and case-insensitive prefix must preserve their age requirements.");
                    }
                    cases.Add(new { name, actualPolicy = Describe(policy) });
                }
                cultures.Add(new { actualCulture = culture, actualCases = cases });
            }
        }
        finally
        {
            CultureInfo.CurrentCulture = current;
            CultureInfo.CurrentUICulture = currentUi;
        }
        Evidence.Write("characterization", new
        {
            actualVariant = Evidence.Variant, actualTimingRun = false, actualProfiles,
            actualConfiguredNamedDelegation = true, actualConfiguredMalformedNameDelegation = true,
            actualConfiguredDefaultDelegation = true, actualConfiguredFallbackDelegation = true,
            actualUnknownAndOverflowRemainNull = true, actualCultureCases = cultures,
            actualDirectCallsRemainUncached = true, actualExistingDifferentUserHttpTestsRequiredSeparately = true,
            actualGeneralChangingDataProviderOrLiveOptionsMutationClaimed = false,
            actualColdConcurrentSingleConstructionPromised = false,
            actualRootNoPolicyRequestNotUsedAsUnchangedControl = true
        });
    }

    private static ClaimsPrincipal Person(int age) => new(new ClaimsIdentity(
        [new Claim(ClaimTypes.DateOfBirth, DateTime.Now.AddYears(-age).ToString("MM/dd/yyyy", CultureInfo.InvariantCulture))],
        "untimed-handler-characterization"));

    private static int? Age(IAuthorizationRequirement requirement)
    {
        if (requirement.GetType().Assembly != typeof(Startup).Assembly)
        {
            return null;
        }
        var property = requirement.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Single(item => item.PropertyType == typeof(int) && item.GetMethod is not null);

        return (int)property.GetValue(requirement)!;
    }

    private static object Describe(AuthorizationPolicy? policy)
    {
        if (policy is null)
        {
            return new { found = false };
        }

        return new
        {
            found = true, schemes = policy.AuthenticationSchemes.ToArray(),
            requirements = policy.Requirements.Select(requirement => new { type = requirement.GetType().FullName, age = Age(requirement) }).ToArray()
        };
    }
}
