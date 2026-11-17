using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime;
using System.Runtime.Versioning;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Engines;
using BenchmarkDotNet.Exporters.Csv;
using BenchmarkDotNet.Exporters.Json;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Perfolizer.Horology;

namespace AutoPerf;

internal static class Evidence
{
    private static int _sequence;
    public static string StateDirectory { get; set; } = "";
    public static object InitialSettings { get; } = SettingsPreservingEmitToolchain.ReadSettings();
    public static string Hash(string file) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file)));
    public static string Compact(object value) => JsonSerializer.Serialize(value);

    public static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    public static void Write(string name, object value)
    {
        var index = Interlocked.Increment(ref _sequence);
        File.WriteAllText(Path.Combine(StateDirectory, $"{index:D4}-{name}.json"),
            JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = true }));
    }

    public static void SourceWitness(string assembly, params string[] sources)
    {
        var pdb = Path.ChangeExtension(assembly, ".pdb");
        using var pe = new PEReader(File.OpenRead(assembly));
        using var provider = MetadataReaderProvider.FromPortablePdbStream(File.OpenRead(pdb));
        var reader = provider.GetMetadataReader();
        var header = reader.DebugMetadataHeader ?? throw new InvalidOperationException("Actual portable-PDB header required.");
        var id = new BlobContentId(header.Id);
        var entry = pe.ReadDebugDirectory().Single(item => item.Type == DebugDirectoryEntryType.CodeView);
        var codeView = pe.ReadCodeViewDebugDirectoryData(entry);
        Require(codeView.Guid == id.Guid && entry.Stamp == id.Stamp, "Actual PE/portable-PDB content identities differ.");
        var documents = sources.Select(source =>
        {
            var document = reader.Documents.Select(handle => reader.GetDocument(handle))
                .Single(item => reader.GetString(item.Name).Replace('\\', '/').EndsWith("/" + Path.GetFileName(source), StringComparison.Ordinal));
            var expected = reader.GetBlobBytes(document.Hash);
            var algorithm = reader.GetGuid(document.HashAlgorithm);
            var bytes = File.ReadAllBytes(source);
            var observed = algorithm == new Guid("8829d00f-11b8-4213-878b-770e8597ac16") ? SHA256.HashData(bytes)
                : algorithm == new Guid("ff1816ec-aa5e-4d10-87f7-6f4963833460") ? SHA1.HashData(bytes)
                : throw new InvalidOperationException("Unsupported actual portable-PDB document checksum.");
            Require(expected.AsSpan().SequenceEqual(observed), "Actual source/PDB document differs:" + source);
            return new { source, algorithm, checksum = Convert.ToHexString(expected), sha256 = Hash(source) };
        }).ToArray();
        Write("source-pdb-" + Path.GetFileNameWithoutExtension(assembly), new
        {
            assemblySha256 = Hash(assembly), pdbSha256 = Hash(pdb), codeViewGuid = codeView.Guid, pdbGuid = id.Guid,
            stamp = id.Stamp, actualPePdbBindingMatched = true, documents, notCompleteBuildProvenanceOrMethodCoverage = true,
        });
    }
}

internal static class Program
{
    public static int Main(string[] args)
    {
        var arguments = args.ToList();
        string RemoveOption(string option)
        {
            var index = arguments.IndexOf(option);
            Evidence.Require(index >= 0 && index + 1 < arguments.Count, "Explicit option required:" + option);
            var value = arguments[index + 1];
            arguments.RemoveRange(index, 2);
            return value;
        }
        var sources = RemoveOption("--sources");
        var context = RemoveOption("--context");
        var mode = RemoveOption("--mode");
        var closurePath = RemoveOption("--closure");
        var expectedOwner = RemoveOption("--expected-owner");
        Evidence.Require(mode is "characterize" or "measure" or "first-use", "Explicit actual characterization/measurement mode required.");
        var firstShape = mode == "first-use" ? RemoveOption("--first-case") : null;
        var artifactIndex = arguments.IndexOf("--artifacts");
        Evidence.Require(artifactIndex >= 0 && artifactIndex + 1 < arguments.Count && Path.IsPathRooted(arguments[artifactIndex + 1]),
            "Explicit absolute artifact directory required.");
        Evidence.StateDirectory = Path.Combine(arguments[artifactIndex + 1], "states");
        Evidence.Require(!Directory.Exists(Evidence.StateDirectory), "Do not overwrite existing actual evidence.");
        Directory.CreateDirectory(Evidence.StateDirectory);
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        Evidence.Require(!MetadataUpdater.IsSupported, "The primary normal-process comparison must not enable metadata updates.");
        using var closure = JsonDocument.Parse(File.ReadAllBytes(closurePath));
        var output = Path.GetDirectoryName(typeof(Program).Assembly.Location) ?? throw new InvalidOperationException("Actual harness directory required.");
        var declared = closure.RootElement.GetProperty("files").EnumerateArray().Select(file =>
        {
            var relative = file.GetProperty("path").GetString() ?? throw new InvalidOperationException("Closure path absent.");
            var actual = Path.GetFullPath(Path.Combine(output, relative));
            Evidence.Require(actual.StartsWith(output + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase),
                "A declared closure file escapes the actual consumer directory.");
            Evidence.Require(Evidence.Hash(actual) == file.GetProperty("sha256").GetString(), "Actual consumer closure differs:" + relative);
            return relative;
        }).Order(StringComparer.Ordinal).ToArray();
        var discovered = Directory.EnumerateFiles(output, "*", SearchOption.AllDirectories)
            .Select(file => Path.GetRelativePath(output, file)).Order(StringComparer.Ordinal).ToArray();
        Evidence.Require(declared.SequenceEqual(discovered, StringComparer.Ordinal), "Actual consumer closure file set differs.");
        var owner = typeof(ModelExpressionProvider).Assembly;
        Evidence.Require(Evidence.Hash(owner.Location) == expectedOwner, "The actual loaded MVC owner differs.");
        var target = owner.GetCustomAttribute<TargetFrameworkAttribute>()?.FrameworkName;
        Evidence.Require(target == ".NETCoreApp,Version=v12.0" && Environment.Is64BitProcess, "Actual net12/x64 MVC product required.");
        if (firstShape is not null)
        {
            var allocatedBefore = GC.GetAllocatedBytesForCurrentThread();
            var started = Stopwatch.GetTimestamp();
            var observed = FirstUse.Exercise(firstShape);
            var elapsedTicks = Stopwatch.GetTimestamp() - started;
            var allocated = GC.GetAllocatedBytesForCurrentThread() - allocatedBefore;
            FirstUse.Validate(observed);
            Evidence.Write("first-observed-public-call", new
            {
                context, observed, actualElapsedTicks = elapsedTicks, stopwatchFrequency = Stopwatch.Frequency,
                actualAllocatedBytes = allocated,
                boundary = "First family fixture construction and one real public wrapper in this instrumented process. Includes JIT,metadata and fixture costs. Not whole-process startup or isolated cache-entry cost.",
                comparisonAccountingRecordedExternallyBeforeLaunch = true,
            });
        }
        Evidence.SourceWitness(owner.Location, new[]
        {
            "ExpressionHelper.cs", "ModelExpressionProvider.cs", "ExpressionMetadataProvider.cs",
            "CachedExpressionCompiler.cs", "LambdaExpressionComparer.cs",
        }.Select(name => Path.Combine(sources, "owner", name)).ToArray());
        Evidence.SourceWitness(typeof(Program).Assembly.Location, new[]
        {
            "Program.cs", "ExpressionFixture.cs", "ExpressionBenchmarks.cs", "FirstUse.cs", "SettingsPreservingEmitToolchain.cs",
        }.Select(name => Path.Combine(sources, "harness", name)).ToArray());
        using var process = Process.GetCurrentProcess();
        var runtimeAssemblies = new[] { typeof(object).Assembly, typeof(ExpressionFixture).Assembly, typeof(System.Linq.Expressions.Expression).Assembly, typeof(Job).Assembly }
            .Select(assembly => new
            {
                name = assembly.GetName().Name, path = assembly.Location, sha256 = Evidence.Hash(assembly.Location),
                informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
                fileVersion = FileVersionInfo.GetVersionInfo(assembly.Location).FileVersion,
            }).ToArray();
        Evidence.Write("runtime", new
        {
            candidate = "F022", context, mode, processId = process.Id, runtime = Environment.Version.ToString(),
            ownerTargetFramework = target, ownerPath = owner.Location, ownerSha256 = Evidence.Hash(owner.Location),
            harnessSha256 = Evidence.Hash(typeof(Program).Assembly.Location), runtimeAssemblies,
            serverGc = GCSettings.IsServerGC, initialSettings = Evidence.InitialSettings,
            actualMetadataUpdatesSupported = MetadataUpdater.IsSupported, actualX64Process = Environment.Is64BitProcess,
            actualClosureSha256 = Evidence.Hash(closurePath), actualClosureFileCount = declared.Length,
            sharedMachineNotIsolated = true,
            boundary = "Actual public ModelExpressionProvider indexed names,metadata and lazy model values. Internal classifier rows are explanatory only. No HTTP/browser/rendering or production-frequency claim.",
        });
        if (mode == "first-use")
        {
            return 0;
        }
        if (mode == "characterize")
        {
            foreach (var profile in ExpressionProfiles.All)
            {
                var fixture = new ExpressionFixture(profile);
                fixture.CaptureContract("retained-index1");
                fixture.SetIndex(2);
                fixture.CaptureContract("retained-index2");
                fixture.SetIndex(0);
                fixture.CaptureContract("retained-index0");
            }
            Evidence.Write("characterization-completed", new
            {
                context, allSuccessful = true, actualTimedWrapperPaths = ExpressionProfiles.All.Length,
                actualRecordedProfileContracts = ExpressionProfiles.All.Length * 3,
            });
            Console.WriteLine($"F022:{ExpressionProfiles.All.Length} actual wrappers and{ExpressionProfiles.All.Length * 3} producer contracts passed.");
            return 0;
        }
        var job = Job.Default.WithId("SettingsPreserving-F022").WithToolchain(new SettingsPreservingEmitToolchain())
            .WithStrategy(RunStrategy.Throughput).WithIterationTime(TimeInterval.FromMilliseconds(100))
            .WithWarmupCount(3).WithIterationCount(8).WithUnrollFactor(1).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var summaries = BenchmarkSwitcher.FromTypes([typeof(ExpressionBenchmarks)]).Run(arguments.ToArray(), config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Count() == ExpressionProfiles.All.Length &&
            summaries[0].Reports.All(report => report.Success), "Every expected actual MVC report must succeed.");
        Evidence.Write("completed", new
        {
            actualReports = ExpressionProfiles.All.Length, allSuccessful = true, context,
            singleActualOwnerProfile = true, comparisonAccountingRecordedExternallyBeforeLaunch = true,
        });
        return 0;
    }
}
