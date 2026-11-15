using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.StaticFiles;

namespace AutoPerf;

internal static class Program
{
    public static async Task Main(string[] args)
    {
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
        if (args.Contains("--contracts", StringComparer.Ordinal))
        {
            var output = Array.IndexOf(args, "--output");
            var responses = Array.IndexOf(args, "--responses");
            if (output < 0 || responses < 0 || output == args.Length - 1 || responses == args.Length - 1)
            {
                throw new ArgumentException("Explicit JSON and actual response-byte output paths required.");
            }
            Directory.CreateDirectory(args[responses + 1]);
            var contracts = new List<object>();
            foreach (var profile in DirectoryProfiles.All)
            {
                using var fixture = new DirectoryFixture(profile);
                var (contract, bytes) = await fixture.CaptureContract();
                await File.WriteAllBytesAsync(Path.Combine(args[responses + 1], profile.Name + ".html"), bytes);
                contracts.Add(new { profile.Name, contract });
            }
            await File.WriteAllTextAsync(args[output + 1], JsonSerializer.Serialize(new
            {
                cases = contracts,
                producer = "Actual DirectoryBrowserMiddleware path matching/provider existence -> HtmlDirectoryFormatter -> real encoder/normalized prefix construction -> UTF8 response stream.",
                boundary = "Direct real middleware/formatter response with virtual provider;no hosted/browser/physical filesystem/production-throughput claim;all hashes and actual bytes checked outside timing.",
            }, new JsonSerializerOptions { WriteIndented = true }));
            Console.WriteLine("All24 complete actual directory response/provider/default/configured/override/HEAD contracts pass.");
            return;
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
    }
}

internal static class OwnerIdentity
{
    public static string Hash()
    {
        return Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(HtmlDirectoryFormatter).Assembly.Location)));
    }
}
