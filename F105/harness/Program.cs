using System.Globalization;
using System.Reflection;
using System.Runtime;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.DataAnnotations;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace AutoPerf;

internal static class Evidence
{
    internal static string StateDirectory { get; set; } = string.Empty;
    internal static string InputDirectory { get; set; } = string.Empty;
    internal static readonly string OwnerSha256 = Hash(typeof(ValidationStateDictionary).Assembly.Location);
    internal static readonly string HarnessSha256 = Hash(typeof(Evidence).Assembly.Location);

    internal static string Hash(string file) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file)));
    internal static string Compact(object value) => JsonSerializer.Serialize(value);

    internal static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    internal static void Write(string name, object value)
    {
        using var output = new FileStream(Path.Combine(StateDirectory, name + ".json"), FileMode.CreateNew);
        JsonSerializer.Serialize(output, value, new JsonSerializerOptions { WriteIndented = true });
    }

    internal static object WriteInput(Workload workload)
    {
        var file = Path.Combine(InputDirectory, workload.Label + ".json");
        using (var output = new FileStream(file, FileMode.CreateNew))
        {
            JsonSerializer.Serialize(output, workload.Input(), new JsonSerializerOptions { WriteIndented = true });
        }

        return new { label = workload.Label, fileName = workload.Label + ".json", sha256 = Hash(file), bytes = new FileInfo(file).Length };
    }
}

internal static class Program
{
    public static int Main(string[] args)
    {
        var index = Array.IndexOf(args, "--artifacts");
        if (index < 0 || index + 1 >= args.Length || !Path.IsPathFullyQualified(args[index + 1]))
        {
            throw new ArgumentException("An explicit absolute --artifacts directory is required.");
        }
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        Evidence.StateDirectory = Path.Combine(args[index + 1], "states");
        Evidence.InputDirectory = Path.Combine(args[index + 1], "inputs");
        Directory.CreateDirectory(Evidence.StateDirectory);
        Directory.CreateDirectory(Evidence.InputDirectory);
        Evidence.Require(GCSettings.IsServerGC && RuntimeInformation.ProcessArchitecture == Architecture.X64,
            "The pinned x64 server-GC execution environment is required.");
        Evidence.Write("runtime", new
        {
            runtime = Environment.Version.ToString(),
            processId = Environment.ProcessId,
            architecture = RuntimeInformation.ProcessArchitecture.ToString(),
            processorCount = Environment.ProcessorCount,
            corelibInformationalVersion = typeof(object).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
            corelibSha256 = Evidence.Hash(typeof(object).Assembly.Location),
            corelibMvid = typeof(object).Assembly.ManifestModule.ModuleVersionId,
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            ownerMvid = typeof(ValidationStateDictionary).Assembly.ManifestModule.ModuleVersionId,
            mvcCoreSha256 = Evidence.Hash(typeof(DefaultModelBindingContext).Assembly.Location),
            dataAnnotationsSha256 = Evidence.Hash(typeof(RequiredAttributeAdapter).Assembly.Location),
            serverGc = GCSettings.IsServerGC,
            configuredConcurrentGc = true,
            profiles = Workload.Labels,
            baselineOnlyProfileNotOptimizationComparison = true,
            boundary = "Actual public ValidationStateDictionary complete traversal,or factory-created state/actual public-DI object validation. Warm managed service,not HTTP/model binding/browser/production frequency."
        });
        if (args.Contains("--characterize", StringComparer.Ordinal))
        {
            Probe.Run();

            return 0;
        }
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);

        return 0;
    }
}
