using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Runtime;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Running;

namespace AutoPerf;

internal static class Evidence
{
    internal static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    internal static string FixtureDirectory { get; set; } = string.Empty;
    internal static string StateDirectory { get; set; } = string.Empty;
    internal static string Variant { get; set; } = string.Empty;
    internal static object InitialSettings { get; set; } = new();
    internal static string Hash(string file) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file)));
    internal static string Compact(object? value) => JsonSerializer.Serialize(value);
    internal static byte[] Bytes(object value) => JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions);
    internal static Assembly[] Owners => Workload.OwnerNames.Select(name => Assembly.Load(name)).ToArray();
    internal static object[] OwnerIdentities() => Owners.Select(Identity).ToArray();
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
    internal static object Identity(Assembly assembly) => new
    {
        assembly = assembly.GetName().Name, file = assembly.Location, sha256 = Hash(assembly.Location), mvid = assembly.ManifestModule.ModuleVersionId,
        informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
    };
    internal static object Verify(Spec spec, Workload workload)
    {
        var input = Path.Combine(FixtureDirectory, "inputs", spec.Label + ".json");
        var expected = Path.Combine(FixtureDirectory, "expected", spec.Label + ".json");
        var result = workload.Verify();
        Require(File.ReadAllBytes(input).AsSpan().SequenceEqual(Bytes(workload.Input)) &&
            File.ReadAllBytes(expected).AsSpan().SequenceEqual(Bytes(result)), "Frozen independently asserted input/output differs:" + spec.Label);

        return new { spec.Label, inputSha256 = Hash(input), outputSha256 = Hash(expected), result, passed = true };
    }
}

internal static class Program
{
    private static object? s_sink;
    public static int Main(string[] args)
    {
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        Evidence.InitialSettings = SettingsPreservingEmitToolchain.ReadSettings();
        var settings = JsonSerializer.SerializeToElement(Evidence.InitialSettings);
        Evidence.Require(GCSettings.IsServerGC && RuntimeInformation.ProcessArchitecture == Architecture.X64 &&
            settings.GetProperty("processPriority").GetString() == "Normal" && settings.GetProperty("threadPriority").GetString() == "Normal",
            "Require preexisting x64/server-GC/Normal settings;never mutate them to satisfy the guard.");
        if (args.Length == 2 && args[0] == "--create-fixture")
        {
            CreateFixture(args[1]);

            return 0;
        }
        string Option(string name)
        {
            var index = Array.IndexOf(args, name);

            return index >= 0 && index + 1 < args.Length ? args[index + 1] : throw new ArgumentException("Explicit option required:" + name);
        }
        Evidence.FixtureDirectory = Option("--fixture");
        Evidence.Variant = Option("--variant");
        var artifacts = Option("--artifacts");
        Evidence.Require(Path.IsPathFullyQualified(artifacts) && Path.IsPathFullyQualified(Evidence.FixtureDirectory) &&
            Evidence.Variant is "original" or "candidate1", "New absolute fixture/artifacts paths and explicit original/candidate1 required.");
        Evidence.StateDirectory = Path.Combine(artifacts, "states");
        Directory.CreateDirectory(Evidence.StateDirectory);
        var processWide = typeof(BenchmarkDotNet.Engines.GcStats).GetField("GetTotalAllocatedBytesDelegate", BindingFlags.Static | BindingFlags.NonPublic)!.GetValue(null);
        Evidence.Require(processWide is Func<bool, long>, "Pinned BDN process-wide precise allocation delegate must exist on this runtime.");
        Evidence.Require(Evidence.Owners.All(owner => owner.Location.StartsWith(AppContext.BaseDirectory, StringComparison.OrdinalIgnoreCase)),
            "Actual locally built owner/producer images must load from the frozen application image,not installed ASP.NET Core fallback.");
        Evidence.Write("runtime", new
        {
            candidate = "F118", variant = Evidence.Variant, processId = Environment.ProcessId, runtime = Environment.Version.ToString(),
            architecture = RuntimeInformation.ProcessArchitecture.ToString(), processorCount = Environment.ProcessorCount,
            serverGc = GCSettings.IsServerGC, configuredConcurrentGc = true, settings = Evidence.InitialSettings,
            owners = Evidence.OwnerIdentities(), harness = Evidence.Identity(typeof(Program).Assembly),
            corelib = Evidence.Identity(typeof(object).Assembly), json = Evidence.Identity(typeof(JsonSerializer).Assembly),
            benchmarkDotNet = Evidence.Identity(typeof(BenchmarkDotNet.Engines.GcStats).Assembly), processWidePreciseBdnAllocationDelegateAvailable = true,
            fixtureManifestSha256 = Evidence.Hash(Path.Combine(Evidence.FixtureDirectory, "manifest.json")),
            cases = Cases.All,
            boundary = "Actual public Process,real ordered runner/producer and URL factory;ordinary RazorPageBase attribute producer is an unchanged HtmlString fast-path control. No network/full-page/application speedup. Parallel is12x64 actual attribute calls/coordinated batch. Pinned BDN0.13 allocation is process-wide including workers;separate calipers attribute loops. Shared VM,not isolated."
        });
        if (args.Contains("--cold-state", StringComparer.Ordinal))
        {
            var before = GC.GetTotalAllocatedBytes(precise: true);
            using var small = new Workload(Cases.All.Single(spec => spec.Label == "Prepared1K"));
            var first = small.Verify();
            var allocated = GC.GetTotalAllocatedBytes(precise: true) - before;
            var afterFirst = Controls.PoolState();
            using var large = new Workload(Cases.All.Single(spec => spec.Label == "Prepared8K"));
            var oversized = large.Verify();
            var afterOversized = Controls.PoolState();
            Evidence.Write("cold-state", new { first, oversized, firstWorkloadAndVerificationProcessAllocatedBytes = allocated, afterFirst, afterOversized,
                limitation = "Fresh process phase includes constructor/JIT/verification effects;read-only materialized pool state after producers stop. Not isolated type-initializer cost,total heap size,cold latency or exhaustive schedule proof." });

            return 0;
        }
        Evidence.Write("render-controls", Controls.RenderContracts());
        if (args.Contains("--characterize", StringComparer.Ordinal))
        {
            foreach (var spec in Cases.All)
            {
                using var workload = new Workload(spec);
                Evidence.Write("contract-" + spec.Label, Evidence.Verify(spec, workload));
                Evidence.Write("caliper-" + spec.Label, new { spec.Label, diagnosticOnly = true, samples = Calipers(workload) });
                Evidence.Verify(spec, workload);
            }
            Evidence.Write("final-pool-state", Controls.PoolState());

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
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(Job.ShortRun
            .WithToolchain(new SettingsPreservingEmitToolchain()).WithPowerPlan(Guid.Empty).WithId("SettingsPreservingEmit"));
        var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(benchmarkArguments.ToArray(), config).ToArray();
        Evidence.Require(summaries.Length > 0 && summaries.All(summary => !summary.HasCriticalValidationErrors && summary.Reports.All(report => report.Success)),
            "Every requested actual BDN case must execute successfully.");
        Evidence.Write("final-pool-state", Controls.PoolState());

        return 0;
    }

    private static object[] Calipers(Workload workload)
    {
        var operations = workload.Parallel is null ? 4096 : 16;
        var warmups = workload.Parallel is null ? 512 : 8;
        for (var index = 0; index < warmups; index++)
        {
            s_sink = workload.Run();
        }
        var samples = new List<object>();
        for (var sample = 0; sample < 5; sample++)
        {
            var workers = new long[workload.Parallel is null ? 0 : ParallelWork.Workers];
            var thread = Environment.CurrentManagedThreadId;
            var processBefore = GC.GetTotalAllocatedBytes(precise: true);
            var before = GC.GetAllocatedBytesForCurrentThread();
            var started = Stopwatch.GetTimestamp();
            for (var index = 0; index < operations; index++)
            {
                s_sink = workload.Run();
                if (workload.Parallel is not null)
                {
                    for (var worker = 0; worker < workers.Length; worker++)
                    {
                        workers[worker] += workload.Parallel.Allocations[worker];
                    }
                }
            }
            var elapsed = Stopwatch.GetElapsedTime(started);
            var allocated = GC.GetAllocatedBytesForCurrentThread() - before;
            var processAllocated = GC.GetTotalAllocatedBytes(precise: true) - processBefore;
            Evidence.Require(thread == Environment.CurrentManagedThreadId, "Synchronous main-thread caliper migrated threads.");
            samples.Add(new
            {
                sample, operations, thread, allocatedBytes = allocated, bytesPerOperation = (double)allocated / operations,
                workerAllocatedBytes = workers, totalWorkerAllocatedBytes = workers.Sum(),
                workerBytesPerAttributeCall = workers.Length == 0 ? (double?)null : (double)workers.Sum() / (operations * ParallelWork.Workers * ParallelWork.CallsPerWorker),
                processAllocatedBytes = processAllocated, processBytesPerOperation = (double)processAllocated / operations,
                diagnosticElapsedMilliseconds = elapsed.TotalMilliseconds
            });
        }

        return samples.ToArray();
    }

    private static void CreateFixture(string root)
    {
        Evidence.Require(Path.IsPathFullyQualified(root) && !Directory.Exists(root), "New isolated absolute original fixture directory required.");
        Directory.CreateDirectory(Path.Combine(root, "inputs"));
        Directory.CreateDirectory(Path.Combine(root, "expected"));
        var cases = new List<object>();
        foreach (var spec in Cases.All)
        {
            using var workload = new Workload(spec);
            var input = Path.Combine(root, "inputs", spec.Label + ".json");
            var expected = Path.Combine(root, "expected", spec.Label + ".json");
            Evidence.WriteAt(input, workload.Input);
            Evidence.WriteAt(expected, workload.Verify());
            cases.Add(new { spec.Label, inputSha256 = Evidence.Hash(input), outputSha256 = Evidence.Hash(expected) });
        }
        Evidence.WriteAt(Path.Combine(root, "render-controls.json"), Controls.RenderContracts());
        Evidence.WriteAt(Path.Combine(root, "manifest.json"), new { candidate = "F118", originalProducer = true, cases = cases.ToArray() });
        Console.WriteLine("F118:24 independently asserted fixtures,actual runner/custom-content and ordinary Razor buffered producer,render/culture/error/reentrancy controls created.");
    }
}

[MemoryDiagnoser]
public class UrlBenchmark
{
    private Workload _workload = null!;
    [ParamsSource(nameof(CaseNames))]
    public string Case { get; set; } = string.Empty;
    public IEnumerable<string> CaseNames => Cases.All.Select(spec => spec.Label);
    [GlobalSetup]
    public void Setup()
    {
        var spec = Cases.All.Single(spec => spec.Label == Case);
        _workload = new Workload(spec);
        var contract = Evidence.Verify(spec, _workload);
        var marker = new { candidate = "F118", variant = Evidence.Variant, Case, processId = Environment.ProcessId,
            owners = Evidence.OwnerIdentities(), harness = Evidence.Identity(typeof(UrlBenchmark).Assembly),
            settings = SettingsPreservingEmitToolchain.ReadSettings(), contract };
        Evidence.Write("contract-" + Case, marker);
        Console.WriteLine("AUTOPERF_F118_SETUP " + Evidence.Compact(marker));
    }
    [Benchmark]
    public object ProcessAttribute() => _workload.Run();
    [GlobalCleanup]
    public void Cleanup()
    {
        _workload.Dispose();
        if (_workload.Parallel is not null)
        {
            Evidence.Write("workers-" + Case, new { initial = _workload.Parallel.InitialSettings, final = _workload.Parallel.FinalSettings,
                lastBatchAllocatedBytes = _workload.Parallel.Allocations,
                limitation = "Point settings observations,not continuous OS tracing. Process-wide BDN includes workers;separate worker calipers attribute actual loops." });
        }
    }
}
