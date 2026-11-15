using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson;

namespace AutoPerf;

internal static class Program
{
    public static void Main(string[] args)
    {
        CultureInfo.DefaultThreadCurrentCulture = CultureInfo.GetCultureInfo("en-US");
        CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.GetCultureInfo("en-US");
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
        if (args.Contains("--contracts", StringComparer.Ordinal))
        {
            var output = Array.IndexOf(args, "--output");
            var states = Array.IndexOf(args, "--states");
            if (output < 0 || states < 0 || output == args.Length - 1 || states == args.Length - 1)
            {
                throw new ArgumentException("Explicit contract JSON and actual state-byte output paths required.");
            }
            Directory.CreateDirectory(args[states + 1]);
            var contracts = new List<object>();
            foreach (var name in JsonPatchFixture.Cases)
            {
                var contract = new JsonPatchFixture(name).Capture();
                contracts.Add(contract);
                File.WriteAllText(Path.Combine(args[states + 1], name + ".json"), contract.State);
            }
            foreach (var name in JsonPatchColdFixture.Cases)
            {
                var contract = new JsonPatchColdFixture(name).Capture();
                contracts.Add(contract);
                File.WriteAllText(Path.Combine(args[states + 1], name + ".json"), JsonSerializer.Serialize(contract));
            }
            File.WriteAllText(args[output + 1], JsonSerializer.Serialize(new
            {
                cases = contracts,
                producer = "Actual public JsonPatchDocument.ApplyTo -> ObjectAdapter/default AdapterFactory -> ObjectVisitor -> ListAdapter/conversion/list or JsonArray effects.",
                boundary = "Actual retained list/JsonArray state,conversion/error and emitted-type first-use reference effects;no private-cache access,host/network/production-throughput claim.",
                cold_boundary = "IterationSetup creates64 distinct RunAndCollect runtime list types outside timing;one first ApplyTo per type. Emission/constructor/document setup and process-first cache initialization are excluded.",
            }, new JsonSerializerOptions { WriteIndented = true }));
            Console.WriteLine("All28 actual public patch/list/JsonArray/error and64-target cold contracts pass.");
            return;
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run([.. args, "--join"]);
    }
}

internal static class OwnerIdentity
{
    public static string Hash()
    {
        return Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(JsonPatchDocument).Assembly.Location)));
    }
}
