using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

internal static class Evidence
{
    public static string StateDirectory { get; set; } = null!;
    public static readonly string OwnerSha256 = Hash(typeof(RazorPage).Assembly.Location);
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
            foreach (var spec in SectionSpec.All)
            {
                using var lifecycle = new SectionLifecycle(spec);
                foreach (var full in new[] { false, true })
                {
                    foreach (var asyncCaller in new[] { false, true })
                    {
                        var method = (full ? "View" : "Page") + (asyncCaller ? "Async" : "Sync");
                        var receipt = SectionBenchmark.Verify(lifecycle, method, full, asyncCaller);
                        Evidence.Write(method + "-" + spec.Name, receipt);
                        Console.WriteLine("AUTOPERF_F094_SETUP " + Evidence.Compact(receipt));
                    }
                }
            }
            Evidence.Write("functional-probe", SectionProbe.VerifyFunctional());
            var rows = SectionProbe.MeasureResources();
            Evidence.Write("resource-check", rows);
            Console.WriteLine("F094: all36 real cases, actual full-view immediate/pending failures and public task/token/lifetime checks passed.");
            Console.WriteLine(Evidence.Compact(rows));
            return 0;
        }
        if (args.Contains("--assert-no-completed-wrapper", StringComparer.Ordinal))
        {
            var rows = SectionProbe.MeasureResources();
            Evidence.Write("zero-wrapper-resource-check", rows);
            var target = rows.Single(row => row.Method == "RenderSection" && row.Present);
            if (target.AllocatedBytes != 0)
            {
                throw new InvalidOperationException($"Actual completed public synchronous sections allocated {target.AllocatedBytes} extra bytes across {target.Operations} primed owners; expected no completed wrapper.");
            }
            Console.WriteLine("F094: actual completed public synchronous sections allocate zero wrapper bytes.");
            return 0;
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
        return 0;
    }
}
