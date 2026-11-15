using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Authentication.Facebook;

namespace AutoPerf;

internal static class Program
{
    public static async Task Main(string[] args)
    {
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
        if (args.Contains("--contracts", StringComparer.Ordinal))
        {
            var index = Array.IndexOf(args, "--output");
            if (index < 0 || index == args.Length - 1)
            {
                throw new ArgumentException("Explicit contract output path required.");
            }
            var contracts = new List<object>();
            foreach (var profile in FacebookProfiles.All)
            {
                using var fixture = new FacebookFixture(profile);
                contracts.Add(new { profile.Name, contract = await fixture.CaptureContract() });
            }
            var cancellation = new List<object>();
            foreach (var mode in new[] { "BeforeRequest", "DuringBuffer", "AfterBuffer" })
            {
                using var fixture = new FacebookFixture(FacebookProfiles.All[0], mode);
                cancellation.Add(new { mode, contract = await fixture.CaptureContract() });
            }
            await File.WriteAllTextAsync(args[index + 1], JsonSerializer.Serialize(new {
                cases = contracts,
                cancellation,
                producer = "Real HttpClient.GetAsync buffers real HttpContent bytes/headers;actual FacebookHandler.CreateTicketAsync executes claim actions/events.",
                timed_boundary = "Actual initialized owner ticket creation including backchannel buffering and uniform external response disposal;no provider network/browser claim.",
            }, new JsonSerializerOptions { WriteIndented = true }));
            return;
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
    }
}

internal static class OwnerIdentity
{
    public static string Hash()
    {
        return Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(FacebookHandler).Assembly.Location)));
    }
}
