using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.Formatters;
using AutoPerf;

Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
if (args.Contains("--contracts"))
{
    var cases = NegotiationCases.All.Select(profile =>
    {
        using var fixture = new NegotiationFixture(profile);
        return new { profile.Name, contract = fixture.Validate() };
    }).ToArray();
    var report = new
    {
        cases,
        raw_producers = NegotiationFixture.ValidateRawProducers(),
        selector_producers = NegotiationFixture.ValidateSelectorProducers(),
        mutations = NegotiationFixture.ValidateMutation(),
        type_check_producers = NegotiationFixture.ValidateTypeCheckProducers(),
        segment_boundaries = NegotiationFixture.ValidateSegmentBoundaries(),
    };
    var index = Array.IndexOf(args, "--output");
    File.WriteAllText(args[index + 1], JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
    return;
}
BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);

internal static class OwnerIdentity
{
    public static string Hash()
    {
        return Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(OutputFormatter).Assembly.Location)));
    }
}
