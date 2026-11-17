using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

public enum Shape
{
    Params2,
    NoValues,
    Array64,
    List64,
    Set1,
    Ord16Last,
    Ord64Last,
    Def64Last,
    Ord64Miss,
    Ord64Early,
    Ignore64
}

public sealed class ProbeRecord
{
    public string Name { get; set; } = "";
    public bool Expected { get; set; }
    public bool Observed { get; set; }
    public string ServiceType { get; set; } = "";
    public string PrincipalType { get; set; } = "";
    public string InputType { get; set; } = "";
    public string ComparerType { get; set; } = "";
    public bool ExactHashSet { get; set; }
    public bool KnownOrdinalComparer { get; set; }
    public bool KnownDefaultComparer { get; set; }
    public bool RetainedAllowedValuesIdentity { get; set; }
    public bool FailureRequirementIdentity { get; set; }
    public bool? NativeSetContains { get; set; }
    public int? ActualSourceEnumerations { get; set; }
    public int? ActualProducerThrows { get; set; }
    public string Note { get; set; } = "";
}

internal sealed class ClaimScenario : IDisposable
{
    private readonly ServiceProvider _provider;
    internal IAuthorizationService Service { get; }
    internal ClaimsPrincipal User { get; set; }
    internal AuthorizationPolicy Policy { get; }
    internal ClaimsAuthorizationRequirement Requirement { get; }
    internal IEnumerable<string>? Allowed { get; }
    internal bool Expected { get; }

    internal ClaimScenario(IEnumerable<string>? allowed, ClaimsPrincipal user, bool expected, bool useParams = false)
    {
        Allowed = allowed;
        User = user;
        Expected = expected;
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorizationCore();
        _provider = services.BuildServiceProvider();
        Service = _provider.GetRequiredService<IAuthorizationService>();
        SharedProof.Require(Service.GetType().FullName == "Microsoft.AspNetCore.Authorization.DefaultAuthorizationServiceImpl",
            "Actual registered default service required.");
        var handlers = _provider.GetServices<IAuthorizationHandler>().ToArray();
        SharedProof.Require(handlers.Length == 1 && handlers[0].GetType() == typeof(PassThroughAuthorizationHandler),
            "Actual registered requirement-dispatch producer required.");
        var builder = new AuthorizationPolicyBuilder();
        if (allowed is null)
        {
            builder.RequireClaim("Permission");
        }
        else if (useParams)
        {
            SharedProof.Require(allowed is string[], "Actual params-overload input must be an array.");
            builder.RequireClaim("Permission", (string[])allowed);
        }
        else
        {
            builder.RequireClaim("Permission", allowed);
        }
        Policy = builder.Build();
        Requirement = (ClaimsAuthorizationRequirement)Policy.Requirements.Single();
        SharedProof.Require(ReferenceEquals(Requirement.AllowedValues, allowed), "Public builder must retain actual caller-owned enumerable.");
    }

    internal Task<AuthorizationResult> Authorize() => Service.AuthorizeAsync(User, resource: null, Policy);

    internal ProbeRecord Observe(string name, AuthorizationResult result, bool expected, string note = "")
    {
        SharedProof.Require(result.Succeeded == expected, name + ":actual public service result differs.");
        var failureIdentity = result.Succeeded ? result.Failure is null
            : result.Failure is not null && ReferenceEquals(result.Failure.FailedRequirements.Single(), Requirement);
        SharedProof.Require(failureIdentity, name + ":actual result/failed requirement identity differs.");
        var set = Allowed as HashSet<string>;

        return new ProbeRecord
        {
            Name = name, Expected = expected, Observed = result.Succeeded, ServiceType = Service.GetType().FullName!,
            PrincipalType = User.GetType().FullName!, InputType = Allowed?.GetType().FullName ?? "<null>",
            ComparerType = set?.Comparer.GetType().FullName ?? "<not-set>", ExactHashSet = set?.GetType() == typeof(HashSet<string>),
            KnownOrdinalComparer = set is not null && ReferenceEquals(set.Comparer, StringComparer.Ordinal),
            KnownDefaultComparer = set is not null && ReferenceEquals(set.Comparer, EqualityComparer<string>.Default),
            RetainedAllowedValuesIdentity = ReferenceEquals(Requirement.AllowedValues, Allowed), FailureRequirementIdentity = failureIdentity, Note = note
        };
    }

    public void Dispose() => _provider.Dispose();
}

internal static class SharedProof
{
    internal static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}

internal static class ClaimSamples
{
    internal static ClaimsPrincipal Principal(string value, string type = "Permission")
        => new(new ClaimsIdentity(new[] { new Claim(type, value) }, "synthetic"));

    internal static ClaimScenario Create(Shape shape)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "synthetic-name"), new(ClaimTypes.NameIdentifier, "synthetic-id")
        };
        for (var index = 0; index < 10; index++)
        {
            claims.Add(new Claim("custom", "unrelated" + index));
        }
        claims.Add(new Claim(ClaimTypes.Role, "role-one"));
        claims.Add(new Claim(ClaimTypes.Role, "role-two"));
        if (shape is Shape.Params2 or Shape.NoValues)
        {
            claims.Add(new Claim("permission", "read"));
            claims.Add(new Claim("permission", "write"));
            return new ClaimScenario(shape == Shape.NoValues ? null : new[] { "admin", "write" },
                new ClaimsPrincipal(new ClaimsIdentity(claims, "synthetic")), expected: true, useParams: shape == Shape.Params2);
        }
        var count = shape == Shape.Set1 ? 1 : shape == Shape.Ord16Last ? 16 : 64;
        var values = Enumerable.Range(0, count).Select(index => "value" + index.ToString("D3")).ToArray();
        var matchingTypeClaims = shape == Shape.Set1 ? 1 : 16;
        for (var index = 0; index < matchingTypeClaims; index++)
        {
            var value = shape == Shape.Ord64Early && index == 0 ? values[0]
                : shape == Shape.Ignore64 ? "VALUE063"
                : shape != Shape.Ord64Miss && index == matchingTypeClaims - 1 ? values[count - 1]
                : "missing" + index.ToString("D3");
            claims.Add(new Claim("permission", new string(value.ToCharArray())));
        }
        IEnumerable<string> allowed = shape switch
        {
            Shape.Array64 => values,
            Shape.List64 => new List<string>(values),
            Shape.Def64Last => new HashSet<string>(values),
            Shape.Ignore64 => new HashSet<string>(values, StringComparer.OrdinalIgnoreCase),
            _ => new HashSet<string>(values, StringComparer.Ordinal)
        };

        return new ClaimScenario(allowed, new ClaimsPrincipal(new ClaimsIdentity(claims, "synthetic")),
            expected: shape is not (Shape.Ord64Miss or Shape.Ignore64));
    }
}
