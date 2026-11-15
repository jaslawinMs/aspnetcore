using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.ModelBinding;

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
            foreach (var name in UnionFixture.Cases)
            {
                using var fixture = new UnionFixture(name);
                var contract = fixture.Capture();
                contracts.Add(contract);
                File.WriteAllText(Path.Combine(args[states + 1], name + ".json"), contract.State);
            }
            foreach (var name in UnionColdFixture.Cases)
            {
                using var fixture = new UnionColdFixture(name);
                var contract = fixture.Capture();
                contracts.Add(contract);
                File.WriteAllText(Path.Combine(args[states + 1], name + ".json"), contract.State);
            }
            File.WriteAllText(args[output + 1], JsonSerializer.Serialize(new
            {
                cases = contracts,
                producer = "Actual DI-created IObjectModelValidator/ObjectModelValidator/ValidationVisitor/default metadata/union strategy -> real ModelState/getter/filter/case-validator effects.",
                boundary = "Actual MVC validation and state effects;not an isolated GetInterfaceMap proxy or hosted HTTP throughput.",
                cold_boundary = "IterationSetup emits64 distinct union runtime Types andprepares default metadata outside timing;one first public Validate per Type. Existing PropertyHelper roots mean no full-MVC unloadability claim.",
            }, new JsonSerializerOptions { WriteIndented = true }));
            Console.WriteLine("All32 actual MVC validation/state/getter/filter and64-target first-use contracts pass.");
            return;
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run([.. args, "--join"]);
    }
}

internal static class OwnerIdentity
{
    public static string Hash()
    {
        return Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(ObjectModelValidator).Assembly.Location)));
    }
}
