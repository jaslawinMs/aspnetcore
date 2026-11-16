using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Runtime;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.TagHelpers.Cache;
using Microsoft.Extensions.Caching.Distributed;

namespace AutoPerf;

internal static class Evidence
{
    internal static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    internal static string FixtureDirectory { get; set; } = string.Empty;
    internal static string StateDirectory { get; set; } = string.Empty;
    internal static string Variant { get; set; } = string.Empty;
    internal static string Hash(string file) => HashBytes(File.ReadAllBytes(file));
    internal static string HashBytes(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes));
    internal static string Compact(object? value) => JsonSerializer.Serialize(value);
    internal static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
    internal static void WriteAt(string file, object value)
    {
        using var output = new FileStream(file, FileMode.CreateNew);
        JsonSerializer.Serialize(output, value, JsonOptions);
    }
    internal static void Write(string name, object value) => WriteAt(Path.Combine(StateDirectory, name + ".json"), value);
    internal static object AssemblyIdentity(Assembly assembly) => new
    {
        assembly = assembly.GetName().Name, file = assembly.Location, sha256 = Hash(assembly.Location), mvid = assembly.ManifestModule.ModuleVersionId,
        informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
    };
}

internal static class Program
{
    private static object? _sink;

    public static int Main(string[] args)
    {
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        Evidence.Require(GCSettings.IsServerGC && RuntimeInformation.ProcessArchitecture == Architecture.X64, "Pinned x64/server-GC execution required.");
        if (args.Length == 2 && args[0] == "--create-fixture")
        {
            CreateFixture(args[1]);

            return 0;
        }
        string ReadOption(string name)
        {
            var index = Array.IndexOf(args, name);

            return index >= 0 && index + 1 < args.Length ? args[index + 1] : throw new ArgumentException("Explicit option required:" + name);
        }
        var artifacts = ReadOption("--artifacts");
        Evidence.FixtureDirectory = ReadOption("--fixture");
        Evidence.Variant = ReadOption("--variant");
        Evidence.Require(Path.IsPathFullyQualified(artifacts) && Path.IsPathFullyQualified(Evidence.FixtureDirectory), "Absolute artifact and fixture directories required.");
        Evidence.Require(Evidence.Variant is "original" or "candidate1" or "candidate2" or "candidate3", "Explicit source variant required.");
        Evidence.StateDirectory = Path.Combine(artifacts, "states");
        Directory.CreateDirectory(Evidence.StateDirectory);
        Evidence.Write("runtime", new
        {
            candidate = "F113", variant = Evidence.Variant, processId = Environment.ProcessId, runtime = Environment.Version.ToString(),
            architecture = RuntimeInformation.ProcessArchitecture.ToString(), processorCount = Environment.ProcessorCount,
            serverGc = GCSettings.IsServerGC, configuredConcurrentGc = true,
            owner = Evidence.AssemblyIdentity(typeof(DistributedCacheTagHelperService).Assembly),
            cache = Evidence.AssemblyIdentity(typeof(MemoryDistributedCache).Assembly), harness = Evidence.AssemblyIdentity(typeof(Program).Assembly),
            json = Evidence.AssemblyIdentity(typeof(JsonSerializer).Assembly), corelib = Evidence.AssemblyIdentity(typeof(object).Assembly),
            fixtureManifestSha256 = Evidence.Hash(Path.Combine(Evidence.FixtureDirectory, "manifest.json")),
            cases = Cases.All.Select(spec => new { spec.Label, spec.Mode, spec.ExactOutputLength }),
            boundary = "Actual registered public cache tag-helper/formatter/storage/MemoryDistributedCache;prepared child TagHelperContent. Timed misses include explicit removal/new output;hits/disabled/formatter controls unchanged. Separate direct private Encode delegate bound once outside timing. No Razor/HTTP/external store/input-frequency claim.",
        });
        if (args.Contains("--characterize", StringComparer.Ordinal))
        {
            foreach (var spec in Cases.All)
            {
                using var workload = new Workload(spec, Evidence.FixtureDirectory);
                Evidence.Write("contract-" + spec.Label, workload.Verify(Evidence.FixtureDirectory));
                for (var index = 0; index < 256; index++)
                {
                    _sink = workload.Run();
                }
                var outputBytes = workload.RunAndObserveOutput().Length;
                var operations = outputBytes >= 65536 ? 256 : outputBytes >= 4096 ? 1024 : 4096;
                var samples = new List<object>();
                for (var sample = 0; sample < 5; sample++)
                {
                    var thread = Environment.CurrentManagedThreadId;
                    var processBefore = GC.GetTotalAllocatedBytes(precise: true);
                    var before = GC.GetAllocatedBytesForCurrentThread();
                    var started = Stopwatch.GetTimestamp();
                    for (var index = 0; index < operations; index++)
                    {
                        _sink = workload.Run();
                    }
                    var elapsed = Stopwatch.GetElapsedTime(started);
                    var allocated = GC.GetAllocatedBytesForCurrentThread() - before;
                    var processAllocated = GC.GetTotalAllocatedBytes(precise: true) - processBefore;
                    Evidence.Require(thread == Environment.CurrentManagedThreadId, "Synchronous caliper migrated threads.");
                    samples.Add(new { sample, operations, thread, allocatedBytes = allocated, bytesPerOperation = (double)allocated / operations,
                        processAllocatedBytes = processAllocated, processBytesPerOperation = (double)processAllocated / operations,
                        diagnosticElapsedMilliseconds = elapsed.TotalMilliseconds });
                }
                Evidence.Write("caliper-" + spec.Label, new { spec.Label, spec.Mode, outputBytes, samples });
                Console.WriteLine("AUTOPERF_F113_CALIPER " + Evidence.Compact(new { spec.Label, operations, samples }));
            }
            GC.KeepAlive(_sink);

            return 0;
        }
        var benchmarkArguments = new List<string>();
        for (var index = 0; index < args.Length; index++)
        {
            if (args[index] is "--fixture" or "--variant")
            {
                index++;
            }
            else
            {
                benchmarkArguments.Add(args[index]);
            }
        }
        var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(benchmarkArguments.ToArray()).ToArray();
        Evidence.Require(summaries.Length > 0 && summaries.All(summary => !summary.HasCriticalValidationErrors && summary.Reports.All(report => report.Success)),
            "Every requested actual BDN execution must succeed.");

        return 0;
    }

    private static void CreateFixture(string root)
    {
        Evidence.Require(Path.IsPathFullyQualified(root) && !Directory.Exists(root), "New isolated absolute original fixture directory required.");
        Directory.CreateDirectory(Path.Combine(root, "inputs"));
        Directory.CreateDirectory(Path.Combine(root, "expected"));
        var files = new List<object>();
        foreach (var spec in Cases.All)
        {
            using var workload = new Workload(spec);
            var inputPath = Path.Combine(root, "inputs", spec.Label + ".json");
            Evidence.WriteAt(inputPath, workload.InputSnapshot);
            var output = workload.RunAndObserveOutput();
            var outputPath = Path.Combine(root, "expected", spec.Label + ".bin");
            File.WriteAllBytes(outputPath, output);
            files.Add(new { spec.Label, spec.Mode, spec.ExactOutputLength, inputSha256 = Evidence.Hash(inputPath), outputSha256 = Evidence.Hash(outputPath), outputBytes = output.Length });
        }
        Evidence.WriteAt(Path.Combine(root, "manifest.json"), new
        {
            candidate = "F113", owner = Evidence.AssemblyIdentity(typeof(DistributedCacheTagHelperService).Assembly),
            harness = Evidence.AssemblyIdentity(typeof(Program).Assembly), actualCases = files.Count, files,
            description = "Explicit deterministic synthetic inputs/actual original native-prefix-key-payload envelopes. Hit/disabled/formatter fixtures normalize expected envelopes;their actual operation material is separately checked. No production distribution claim.",
        });
        Console.WriteLine("F113 created " + files.Count + " exact owning-original fixtures.");
    }
}

/// <summary>Actual owning encoder or real cache tag-helper processing.</summary>
[MemoryDiagnoser]
public class DistributedEncodingBenchmark
{
    /// <summary>Explicit synthetic identities,not production input frequencies.</summary>
    public IEnumerable<string> Cases => AutoPerf.Cases.All.Select(spec => spec.Label);

    /// <summary>Safe case identity,not raw content in test names.</summary>
    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private Workload? _workload;

    /// <summary>Resolve actual registrations and verify exact producer/byte/ownership contracts outside timing.</summary>
    [GlobalSetup]
    public void Setup()
    {
        _workload = new Workload(AutoPerf.Cases.All.Single(spec => spec.Label == Case), Evidence.FixtureDirectory);
        var setup = new
        {
            label = Case, variant = Evidence.Variant, processId = Environment.ProcessId, contract = _workload.Verify(Evidence.FixtureDirectory),
            owner = Evidence.AssemblyIdentity(typeof(DistributedCacheTagHelperService).Assembly), harness = Evidence.AssemblyIdentity(typeof(Program).Assembly),
        };
        Evidence.Write("setup-" + Case, setup);
        Console.WriteLine("AUTOPERF_F113_SETUP " + Evidence.Compact(setup));
    }

    /// <summary>Actual prepared operation;no output reads/hashing/verification inside timing.</summary>
    [Benchmark]
    public object EncodeOrProcess()
    {
        var workload = _workload ?? throw new InvalidOperationException("Actual owning setup missing.");

        return workload.Run();
    }

    /// <summary>Dispose only this case's actual isolated service provider/cache.</summary>
    [GlobalCleanup]
    public void Cleanup()
    {
        _workload?.Dispose();
    }
}
