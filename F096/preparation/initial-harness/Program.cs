using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using BenchmarkDotNet.Running;
using Microsoft.JSInterop;

namespace AutoPerf;

internal static class Evidence
{
    public static string StateDirectory { get; set; } = null!;
    public static readonly string OwnerSha256 = Hash(typeof(JSRuntime).Assembly.Location);
    public static readonly string HarnessSha256 = Hash(typeof(Evidence).Assembly.Location);
    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true, Converters = { new JsonStringEnumConverter() }
    };
    public static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));
    public static string Compact(object value) => JsonSerializer.Serialize(value);
    public static void Write(string name, object value) =>
        File.WriteAllText(Path.Combine(StateDirectory, name + ".json"), JsonSerializer.Serialize(value, Options));
}

internal static class Program
{
    public static async Task<int> Main(string[] args)
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
            ownerSha256 = Evidence.OwnerSha256, harnessSha256 = Evidence.HarnessSha256,
            corelibSha256 = Evidence.Hash(typeof(object).Assembly.Location),
            serverGc = System.Runtime.GCSettings.IsServerGC
        });
        if (args.Contains("--characterize", StringComparer.Ordinal) || args.Contains("--require-deadlines", StringComparer.Ordinal))
        {
            var report = await TimeoutProbe.VerifyAsync();
            Evidence.Write("original-contract-resource-probe", report);
            foreach (var row in report.Deadlines)
            {
                Console.WriteLine($"AUTOPERF_F096_DEADLINE {Evidence.Compact(row)}");
            }
            Console.WriteLine($"F096: actual original characterization finished; {report.MissingDeadlines}/{report.Deadlines.Count} managed deadline rows did not cancel. This is not a performance gain or a corrected timeout.");
            if (args.Contains("--require-deadlines", StringComparer.Ordinal) && report.MissingDeadlines != 0)
            {
                return 1;
            }

            return 0;
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
        return 0;
    }
}
