using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Authentication.MicrosoftAccount;

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
                throw new ArgumentException("Explicit JSON output path required.");
            }
            var cases = new List<object>();
            foreach (var profile in MicrosoftProfiles.All)
            {
                using var fixture = new MicrosoftFixture(profile);
                cases.Add(new { profile.Name, contract = await fixture.CaptureContract() });
            }
            var cancellation = new List<object>();
            foreach (var name in new[] { "Utf8Small", "Utf8Large16K", "Utf8Bom16K", "InvalidUtf8Large16K" })
            {
                foreach (var mode in new[] { "BeforeRequest", "DuringBuffer", "AfterBuffer" })
                {
                    using var fixture = new MicrosoftFixture(MicrosoftProfiles.All.Single(p => p.Name == name), mode);
                    var contract = await fixture.CaptureContract();
                    var actual = JsonSerializer.SerializeToElement(contract);
                    if (!actual.GetProperty("caller_cancellation_requested").GetBoolean() ||
                        actual.GetProperty("success").GetBoolean() != (mode == "AfterBuffer") ||
                        actual.GetProperty("creating_ticket_calls").GetInt32() != (mode == "AfterBuffer" ? 1 : 0))
                    {
                        throw new InvalidOperationException("Actual buffer cancellation must reach the expected legacy ticket boundary.");
                    }
                    cancellation.Add(new { name, mode, contract });
                }
            }
            await File.WriteAllTextAsync(args[index + 1], JsonSerializer.Serialize(new
            {
                cases,
                cancellation,
                producer = "Actual HttpClient.SendAsync buffers real content bytes/headers;initialized MicrosoftAccountHandler produces actual Bearer request and ticket/claims.",
                boundary = "Actual ticket creation with uniform external request/response cleanup;async event/document assertions outside timing;no remote-provider/browser claim.",
            }, new JsonSerializerOptions { WriteIndented = true }));
            Console.WriteLine("All24 actual owner profiles and12 producer-driven cancellation cases reached their assertions.");
            return;
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
    }
}

internal static class OwnerIdentity
{
    public static string Hash()
    {
        return Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(MicrosoftAccountHandler).Assembly.Location)));
    }
}
