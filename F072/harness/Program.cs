using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.Formatters;
using AutoPerf;

Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
if (args.Contains("--contracts"))
{
    var records = new List<object>();
    foreach (var profile in FormatterCases.All)
    {
        using var fixture = new FormatterFixture(profile);
        records.Add(new { profile.Name, contract = fixture.Validate() });
    }
    var report = new { cases = records, raw_producers = FormatterFixture.ValidateRawProducers(),
        metadata_updates = FormatterFixture.ValidateMutation() };
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
