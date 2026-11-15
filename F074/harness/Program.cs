using System.Security.Cryptography;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Components.Server;

Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
if (args.Contains("--contracts"))
{
    var cases = FragmentCases.All.Select(profile =>
    {
        var fixture = new FragmentFixture(profile);
        return new { profile.Name, contract = fixture.Validate() };
    }).ToArray();
    var index = Array.IndexOf(args, "--output");
    if (index < 0 || index + 1 >= args.Length)
    {
        throw new ArgumentException("Contracts require --output.");
    }
    File.WriteAllText(args[index + 1], JsonSerializer.Serialize(new
    {
        cases,
        producer = "Actual Endpoints RenderFragmentCapture.Invoke/SerializeFrames, DTO and ServerComponentSerializer; actual Server descriptor parser supplies JsonElements.",
        timed_boundary = "Actual internal Server owner via cached external IL adapter, optional materialization or actual stateless descriptor collection. Reflection is setup-only.",
    }, new JsonSerializerOptions { WriteIndented = true }));
    return;
}
BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);

internal static class OwnerIdentity
{
    public static string Hash()
    {
        return Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(CircuitOptions).Assembly.Location)));
    }
}
