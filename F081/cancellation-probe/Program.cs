using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.Facebook;

namespace AutoPerf;

internal static class CancellationProbe
{
    public static async Task Main(string[] args)
    {
        if (args.Length != 1)
        {
            throw new ArgumentException("One explicit JSON output path required.");
        }
        var owner = typeof(FacebookHandler).Assembly.Location;
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(owner)))}");
        var rows = new List<object>();
        foreach (var name in new[] { "Utf8Large16K", "Utf8Bom16K", "InvalidUtf8Large16K" })
        {
            var profile = FacebookProfiles.All.Single(p => p.Name == name);
            foreach (var mode in new[] { "BeforeRequest", "DuringBuffer", "AfterBuffer" })
            {
                using var fixture = new FacebookFixture(profile, mode);
                var contract = await fixture.CaptureContract();
                var actual = JsonSerializer.SerializeToElement(contract);
                if (profile.Charset != "utf-8" || actual.GetProperty("payload_bytes").GetInt32() < 16 * 1024 ||
                    !actual.GetProperty("caller_cancellation_requested").GetBoolean())
                {
                    throw new InvalidOperationException("Large explicit UTF-8/cancellation preconditions must be produced.");
                }
                if (mode == "AfterBuffer")
                {
                    if (!actual.GetProperty("success").GetBoolean() ||
                        actual.GetProperty("creating_ticket_calls").GetInt32() != 1 ||
                        !actual.GetProperty("payload_document_disposed").GetBoolean() ||
                        !actual.GetProperty("response_disposed").GetBoolean() ||
                        actual.GetProperty("serialized_bytes").GetInt32() != actual.GetProperty("payload_bytes").GetInt32())
                    {
                        throw new InvalidOperationException("Post-buffer cancellation must preserve the actual legacy ticket and disposal.");
                    }
                }
                else if (actual.GetProperty("success").GetBoolean() ||
                    actual.GetProperty("failure").GetString() != nameof(OperationCanceledException) ||
                    actual.GetProperty("creating_ticket_calls").GetInt32() != 0 ||
                    actual.GetProperty("serialized_bytes").GetInt32() != 0)
                {
                    throw new InvalidOperationException("Before/during-buffer cancellation must prevent the actual ticket.");
                }
                rows.Add(new { name, mode, contract });
            }
        }
        await File.WriteAllTextAsync(args[0], JsonSerializer.Serialize(new
        {
            cases = rows,
            producer = "Shared actual HttpClient/HttpContent fixture;large canonical UTF-8 inputs reach the selected size gate.",
            boundary = "Untimed original/selected Facebook CreateTicketAsync;real buffer-write producer causes cancellation.",
        }, new JsonSerializerOptions { WriteIndented = true }));
        Console.WriteLine("Nine large producer-driven cancellation cases reached every assertion.");
    }
}
