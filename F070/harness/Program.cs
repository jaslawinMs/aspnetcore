using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Components.Routing;

var strict = args.Contains("--strict", StringComparer.Ordinal);
AppContext.SetSwitch("Microsoft.AspNetCore.Components.Routing.NavLink.EnableMatchAllForQueryStringAndFragment", strict);
Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Sha256}");
if (args.Contains("--contracts", StringComparer.Ordinal))
{
    var contracts = NavCases.All.Select(@case =>
    {
        using var fixture = new NavLinkFixture(@case, strict);
        var initial = fixture.Validate();
        fixture.Exercise();
        var first = fixture.Validate();
        fixture.Exercise();
        var second = fixture.Validate();
        return new { name = @case.Name, initial, first, second };
    }).ToArray();
    var comparer = (IEqualityComparer<char>)(typeof(NavLink).GetField("CaseInsensitiveComparer",
        BindingFlags.Static | BindingFlags.NonPublic)?.GetValue(null)
        ?? throw new InvalidOperationException("Actual owner comparer was not found."));
    for (var value = 0; value <= char.MaxValue; value++)
    {
        if (!comparer.Equals((char)value, (char)value))
        {
            throw new InvalidOperationException($"Actual reflexive equivalence failed at U+{value:X4}.");
        }
    }
    (string Name, char X, char Y)[] pairs =
    [
        ("AsciiCase", 'a', 'A'), ("Sigma", '\u03a3', '\u03c3'), ("FinalSigma", '\u03a3', '\u03c2'),
        ("SharpS", '\u00df', '\u1e9e'), ("Kelvin", 'K', '\u212a'), ("DotlessI", 'I', '\u0131'),
        ("DottedI", 'i', '\u0130'), ("UncasedDigit", '7', '8'), ("SurrogateContrast", '\ud800', '\ud801')
    ];
    var raw = pairs.Select(pair =>
    {
        var actual = comparer.Equals(pair.X, pair.Y);
        var originalContract = char.ToLowerInvariant(pair.X) == char.ToLowerInvariant(pair.Y);
        if (actual != originalContract)
        {
            throw new InvalidOperationException($"Original character equivalence changed: {pair.Name}.");
        }
        return new { name = pair.Name, x = $"U+{(int)pair.X:X4}", y = $"U+{(int)pair.Y:X4}", equal = actual };
    }).ToArray();
    var outputIndex = Array.IndexOf(args, "--output");
    if (outputIndex < 0 || outputIndex + 1 == args.Length)
    {
        throw new ArgumentException("--contracts requires --output.");
    }
    File.WriteAllText(args[outputIndex + 1], JsonSerializer.Serialize(new
    {
        strict_query_fragment_switch = strict,
        contracts,
        raw_character_diagnostics = new
        {
            identical_utf16_checks = char.MaxValue + 1,
            differing_pairs = raw,
            proves_raw_character_contract_not_browser_uri_reachability = true
        }
    }, new JsonSerializerOptions { WriteIndented = true }) + "\n");
    Console.WriteLine($"Actual owner: {contracts.Length} initialized/rendered profiles; 65536 reflexive characters and {raw.Length} differing pairs checked; strict={strict}.");
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(NavLinkBenchmark).Assembly).Run(args);

namespace AutoPerf
{
    internal static class OwnerIdentity
    {
        public static string Sha256 => Convert.ToHexString(SHA256.HashData(
            File.ReadAllBytes(typeof(NavLink).Assembly.Location)));
    }
}
