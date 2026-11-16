using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.RazorPages.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

internal static class Evidence
{
    public static string StateDirectory { get; set; } = null!;
    public static readonly string OwnerSha256 = Hash(typeof(PageLoader).Assembly.Location);
    public static readonly string HarnessSha256 = Hash(typeof(Evidence).Assembly.Location);
    private static readonly JsonSerializerOptions Indented = new() { WriteIndented = true };
    public static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));
    public static string Compact(object value) => JsonSerializer.Serialize(value);
    public static void Write(string name, object value) =>
        File.WriteAllText(Path.Combine(StateDirectory, name + ".json"), JsonSerializer.Serialize(value, Indented));
}

internal static class Program
{
    public static int Main(string[] args)
    {
        var artifactIndex = Array.IndexOf(args, "--artifacts");
        if (artifactIndex < 0 || artifactIndex + 1 >= args.Length || !Path.IsPathFullyQualified(args[artifactIndex + 1]))
        {
            throw new ArgumentException("An explicit absolute --artifacts path is required.");
        }
        Evidence.StateDirectory = Path.Combine(args[artifactIndex + 1], "states");
        Directory.CreateDirectory(Evidence.StateDirectory);
        Evidence.Write("runtime", new
        {
            runtime = Environment.Version.ToString(), processId = Environment.ProcessId,
            architecture = System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture.ToString(),
            corelibInformationalVersion = typeof(object).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion,
            diInformationalVersion = typeof(ServiceProvider).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion,
            ownerSha256 = Evidence.OwnerSha256, harnessSha256 = Evidence.HarnessSha256,
            corelibSha256 = Evidence.Hash(typeof(object).Assembly.Location),
            diSha256 = Evidence.Hash(typeof(ServiceProvider).Assembly.Location),
            serverGc = System.Runtime.GCSettings.IsServerGC
        });
        if (args.Contains("--verify", StringComparer.Ordinal))
        {
            foreach (var profile in LoaderLifecycle.Profiles)
            {
                using var lifecycle = new LoaderLifecycle(profile);
                foreach (var caller in new[] { "LegacyBridge", "ModernWait", "ModernAsync" })
                {
                    var receipt = LoaderBenchmark.Verify(lifecycle, caller);
                    Evidence.Write(caller + "-" + profile, receipt);
                    Console.WriteLine("AUTOPERF_F095_SETUP " + Evidence.Compact(receipt));
                }
            }
            Evidence.Write("functional-probe", LoaderProbe.VerifyFunctional());
            Evidence.Write("resource-check", LoaderProbe.MeasureResources());
            Console.WriteLine("F095: all12 real loader cases,4 real gated compiler failure/cancel callers and4x5000 actual cache allocation batches passed.");
            return 0;
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
        return 0;
    }
}
