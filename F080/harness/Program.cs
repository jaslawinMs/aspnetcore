using System.Security.Cryptography;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.TagHelpers;

Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
if (args.Contains("--contracts"))
{
    var index = Array.IndexOf(args, "--output");
    if (index < 0 || index + 1 >= args.Length)
    {
        throw new ArgumentException("Contracts require --output.");
    }
    var cases = GlobbingCases.All.Select(profile =>
    {
        using var fixture = new GlobbingFixture(profile);
        return new { profile.Name, contract = fixture.CaptureContract() };
    }).ToArray();
    var comparisons = (from left in GlobbingCases.Matrix
                       from right in GlobbingCases.Matrix
                       select new { left, right, sign = Math.Sign(GlobbingFixture.Comparer.Compare(left, right)) }).ToArray();
    File.WriteAllText(args[index + 1], JsonSerializer.Serialize(new
    {
        cases,
        comparisons,
        producer = "Actual default Matcher and FileProviderGlobbingDirectory over a virtual IFileProvider;actual MemoryCache and cancellation change-token invalidation.",
        timed_boundary = "Actual private comparer via its public IComparer interface,or actual BuildUrlList including invalidation/cache-fill or cache-hit control. Reflection is setup-only.",
    }, new JsonSerializerOptions { WriteIndented = true }));
    return;
}
BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);

internal static class OwnerIdentity
{
    public static string Hash()
    {
        return Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(GlobbingUrlBuilder).Assembly.Location)));
    }
}
