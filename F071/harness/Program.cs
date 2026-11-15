using System.Security.Cryptography;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.Formatters;

Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Sha256}");
if (args.Contains("--contracts", StringComparer.Ordinal))
{
    var outputIndex = Array.IndexOf(args, "--output");
    if (outputIndex < 0 || outputIndex + 1 == args.Length)
    {
        throw new ArgumentException("--contracts requires --output.");
    }
    var cases = FilterCases.All.Select(@case =>
    {
        var fixture = new FormatFilterFixture(@case);
        var first = fixture.Validate();
        fixture.Exercise();
        var second = fixture.Validate();
        return new { name = @case.Name, first, second };
    }).ToArray();
    var metadata = FormatFilterFixture.ValidateMetadataUpdates();
    File.WriteAllText(args[outputIndex + 1], JsonSerializer.Serialize(
        new { cases, metadata_updates = metadata },
        new JsonSerializerOptions { WriteIndented = true }) + "\n");
    Console.WriteLine($"Actual owner: {cases.Length} public resource/result profiles and live metadata/update checks passed.");
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(FormatFilterBenchmark).Assembly).Run(args);

namespace AutoPerf
{
    internal static class OwnerIdentity
    {
        public static string Sha256 => Convert.ToHexString(SHA256.HashData(
            File.ReadAllBytes(typeof(FormatFilter).Assembly.Location)));
    }
}
