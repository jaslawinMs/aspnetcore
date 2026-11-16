using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Runtime;
using System.Runtime.CompilerServices;
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
    internal static object InitialSettings { get; set; } = new();
    internal static string Hash(string file) => HashBytes(File.ReadAllBytes(file));
    internal static string HashBytes(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes));
    internal static string Compact(object? value) => JsonSerializer.Serialize(value);
    internal static byte[] Bytes(object value) => JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions);
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
        assembly = assembly.GetName().Name, file = assembly.Location, sha256 = Hash(assembly.Location),
        mvid = assembly.ManifestModule.ModuleVersionId,
        informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
    };
    internal static object Verify(Spec spec, Workload workload)
    {
        var inputFile = Path.Combine(FixtureDirectory, "inputs", spec.Label + ".json");
        var outputFile = Path.Combine(FixtureDirectory, "expected", spec.Label + ".json");
        var result = workload.Verify();
        Require(File.ReadAllBytes(inputFile).AsSpan().SequenceEqual(Bytes(workload.Input)) &&
            File.ReadAllBytes(outputFile).AsSpan().SequenceEqual(Bytes(result)), "Frozen exact input/result/model fixture differs:" + spec.Label);

        return new { spec.Label, inputSha256 = Hash(inputFile), outputSha256 = Hash(outputFile), result, passed = true };
    }
}

internal static class Program
{
    private static object? _sink;
    private static int _intSink;

    public static int Main(string[] args)
    {
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        Evidence.InitialSettings = SettingsPreservingEmitToolchain.ReadSettings();
        var settings = JsonSerializer.SerializeToElement(Evidence.InitialSettings);
        Evidence.Require(GCSettings.IsServerGC && RuntimeInformation.ProcessArchitecture == Architecture.X64 &&
            settings.GetProperty("processPriority").GetString() == "Normal" && settings.GetProperty("threadPriority").GetString() == "Normal",
            "Pinned x64/server-GC and preexisting Normal priorities required;do not mutate settings to satisfy this guard.");
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
        var artifacts = Option("--artifacts");
        Evidence.Require(Path.IsPathFullyQualified(artifacts) && Path.IsPathFullyQualified(Evidence.FixtureDirectory), "Absolute fresh artifacts/fixture paths required.");
        Evidence.StateDirectory = Path.Combine(artifacts, "states");
        Directory.CreateDirectory(Evidence.StateDirectory);
        Evidence.Write("runtime", new
        {
            candidate = "F115", variant = "original", processId = Environment.ProcessId, runtime = Environment.Version.ToString(),
            architecture = RuntimeInformation.ProcessArchitecture.ToString(), processorCount = Environment.ProcessorCount,
            serverGc = GCSettings.IsServerGC, configuredConcurrentGc = true, settings = Evidence.InitialSettings,
            owner = Evidence.Identity(Bindings.Owner), harness = Evidence.Identity(typeof(Program).Assembly),
            json = Evidence.Identity(typeof(JsonSerializer).Assembly), corelib = Evidence.Identity(typeof(object).Assembly),
            fixtureManifestSha256 = Evidence.Hash(Path.Combine(Evidence.FixtureDirectory, "manifest.json")),
            cases = Cases.All.Select(spec => new { spec.Label, mode = spec.Mode.ToString(), target = spec.Target.ToString() }),
            boundary = "One original pressure sweep,not a source comparison. Actual helper/actual factory-selected adapter and public JSON-converter-created ApplyTo producers. Prepared model/document/bindings outside timing;public traversal/factory/serialization remains inside. No F086 cache,no HTTP/production-frequency/whole-app claim."
        });
        Evidence.Write("object-boundary", Workload.VerifyObjectBoundary());
        if (args.Contains("--characterize", StringComparer.Ordinal))
        {
            foreach (var spec in Cases.All)
            {
                var workload = new Workload(spec);
                Evidence.Write("contract-" + spec.Label, Evidence.Verify(spec, workload));
                Evidence.Write("caliper-" + spec.Label, new { spec.Label, diagnosticOnly = true, samples = Calipers(workload.Run) });
                Evidence.Verify(spec, workload);
            }
            var values = new List<int> { 731 };
            Func<object?> objectReader = () => ReadGenericToObject(values);
            Func<object?> nativeReader = () =>
            {
                _intSink = ReadNativeInt(values);

                return null;
            };
            Evidence.Require(objectReader() is 731 && ReadNativeInt(values) == 731, "Both diagnostics must execute the real supplied value.");
            Evidence.Write("typed-reader-diagnostics", new
            {
                genericToObject = Calipers(objectReader), nativeTypedReturn = Calipers(nativeReader),
                objectResultValue = (int)(objectReader() ?? throw new InvalidOperationException("Object diagnostic lost the value.")),
                nativeResultValue = _intSink, sourceComparison = false,
                limitation = "Harness-only language/allocation diagnostics,not product candidates. Generic IList<T> read returning object still boxes. Native int-return has a different result/escape contract;no timing or speedup comparison is valid."
            });
            GC.KeepAlive(_sink);

            return 0;
        }
        var benchmarkArguments = new List<string>();
        for (var index = 0; index < args.Length; index++)
        {
            if (args[index] == "--fixture")
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
            "Every requested actual BDN original-pressure case must execute successfully.");

        return 0;
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static object? ReadGenericToObject<T>(IList<T> list) => list[0];

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static int ReadNativeInt(IList<int> list) => list[0];

    private static object[] Calipers(Func<object?> operation)
    {
        for (var index = 0; index < 512; index++)
        {
            _sink = operation();
        }
        const int operations = 4096;
        var samples = new List<object>();
        for (var sample = 0; sample < 5; sample++)
        {
            var thread = Environment.CurrentManagedThreadId;
            var processBefore = GC.GetTotalAllocatedBytes(precise: true);
            var before = GC.GetAllocatedBytesForCurrentThread();
            var started = Stopwatch.GetTimestamp();
            for (var index = 0; index < operations; index++)
            {
                _sink = operation();
            }
            var elapsed = Stopwatch.GetElapsedTime(started);
            var allocated = GC.GetAllocatedBytesForCurrentThread() - before;
            var processAllocated = GC.GetTotalAllocatedBytes(precise: true) - processBefore;
            Evidence.Require(thread == Environment.CurrentManagedThreadId, "Synchronous allocation caliper migrated threads.");
            samples.Add(new
            {
                sample, operations, thread, allocatedBytes = allocated, bytesPerOperation = (double)allocated / operations,
                processAllocatedBytes = processAllocated, processBytesPerOperation = (double)processAllocated / operations,
                diagnosticElapsedMilliseconds = elapsed.TotalMilliseconds
            });
        }
        GC.KeepAlive(_sink);

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
            var workload = new Workload(spec);
            var input = Path.Combine(root, "inputs", spec.Label + ".json");
            var output = Path.Combine(root, "expected", spec.Label + ".json");
            Evidence.WriteAt(input, workload.Input);
            Evidence.WriteAt(output, workload.Verify());
            cases.Add(new { spec.Label, mode = spec.Mode.ToString(), target = spec.Target.ToString(), inputSha256 = Evidence.Hash(input), outputSha256 = Evidence.Hash(output) });
        }
        Evidence.WriteAt(Path.Combine(root, "boundary-producer-contract.json"), Workload.VerifyObjectBoundary());
        Evidence.WriteAt(Path.Combine(root, "manifest.json"), new { candidate = "F115", variant = "original", cases });
        Console.WriteLine("F115:28 independently asserted actual helper/adapter/public-producer fixtures and object-boundary controls created.");
    }
}

[MemoryDiagnoser]
public class ListReadBenchmark
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
        var marker = new
        {
            candidate = "F115", variant = "original", Case, processId = Environment.ProcessId,
            owner = Evidence.Identity(Bindings.Owner), harness = Evidence.Identity(typeof(ListReadBenchmark).Assembly),
            settings = SettingsPreservingEmitToolchain.ReadSettings(), contract
        };
        Evidence.Write("contract-" + Case, marker);
        Console.WriteLine("AUTOPERF_F115_SETUP " + Evidence.Compact(marker));
    }

    [Benchmark]
    public object? ReadOrProcess() => _workload.Run();
}
