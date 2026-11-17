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
using Microsoft.AspNetCore.Session;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
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
        Evidence.Require(firstShape is null || SessionProfiles.FirstObserved.Contains(firstShape, StringComparer.Ordinal),
            "The first-observed public wrapper must be declared in advance.");
        var artifactIndex = arguments.IndexOf("--artifacts");
        Evidence.Require(artifactIndex >= 0 && artifactIndex + 1 < arguments.Count && Path.IsPathRooted(arguments[artifactIndex + 1]),
            "Explicit absolute artifact directory required.");
        Evidence.StateDirectory = Path.Combine(arguments[artifactIndex + 1], "states");
        Evidence.Require(!Directory.Exists(Evidence.StateDirectory), "Do not overwrite existing actual evidence.");
        Directory.CreateDirectory(Evidence.StateDirectory);
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
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
        var owner = typeof(DistributedSession).Assembly;
        Evidence.Require(Evidence.Hash(owner.Location) == expectedOwner, "The actual loaded Session owner differs.");
        var target = owner.GetCustomAttribute<TargetFrameworkAttribute>()?.FrameworkName;
        Evidence.Require(target == ".NETCoreApp,Version=v12.0" && Environment.Is64BitProcess, "Actual net12/x64 Session product required.");
        if (firstShape is not null)
        {
            var allocatedBefore = GC.GetAllocatedBytesForCurrentThread();
            var started = Stopwatch.GetTimestamp();
            using var fixture = new SessionFixture(firstShape);
            var operation = fixture.ExerciseAsync();
            Evidence.Require(operation.IsCompletedSuccessfully, "The first real memory-cache wrapper unexpectedly yielded.");
            var observed = operation.GetAwaiter().GetResult();
            var elapsedTicks = Stopwatch.GetTimestamp() - started;
            var allocated = GC.GetAllocatedBytesForCurrentThread() - allocatedBefore;
            Evidence.Require(observed == 42, "The first actual stored public Session payload differs.");
            Evidence.Write("first-observed-public-call", new
            {
                context, profile = firstShape, observed, actualElapsedTicks = elapsedTicks,
                stopwatchFrequency = Stopwatch.Frequency, actualAllocatedBytes = allocated,
                boundary = "First family fixture construction,real memory-cache session seed/commit and one public create/commit-or-refresh/value wrapper. Includes JIT,metadata,seed and caller/fixture costs. Not process startup,isolated entry cost or remote I/O.",
                comparisonAccountingRecordedExternallyBeforeLaunch = true,
            });
        }
        Evidence.SourceWitness(owner.Location, new[]
        {
            "DistributedSession.cs", "DistributedSessionStore.cs", "SessionOptions.cs", "DefaultDistributedSessionStore.cs",
        }.Select(name => Path.Combine(sources, "owner", name)).ToArray());
        Evidence.SourceWitness(typeof(Program).Assembly.Location, new[]
        {
            "Program.cs", "SessionFixture.cs", "SessionBenchmarks.cs", "SessionContracts.cs", "SettingsPreservingEmitToolchain.cs",
        }.Select(name => Path.Combine(sources, "harness", name)).ToArray());
        var runtimeAssemblies = new[] { typeof(object).Assembly, typeof(MemoryDistributedCache).Assembly, typeof(Job).Assembly }
            .Select(assembly => new
            {
                name = assembly.GetName().Name, path = assembly.Location, sha256 = Evidence.Hash(assembly.Location),
                informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
                fileVersion = FileVersionInfo.GetVersionInfo(assembly.Location).FileVersion,
            }).ToArray();
        Evidence.Write("runtime", new
        {
            candidate = "F024", context, mode, processId = Environment.ProcessId, runtime = Environment.Version.ToString(),
            ownerTargetFramework = target, ownerPath = owner.Location, ownerSha256 = Evidence.Hash(owner.Location),
            harnessSha256 = Evidence.Hash(typeof(Program).Assembly.Location), runtimeAssemblies,
            serverGc = GCSettings.IsServerGC, initialSettings = Evidence.InitialSettings,
            actualX64Process = Environment.Is64BitProcess, actualClosureSha256 = Evidence.Hash(closurePath),
            actualClosureFileCount = declared.Length, sharedMachineNotIsolated = true,
            boundary = "Actual public DistributedSessionStore.Create/DistributedSession.CommitAsync with real distributed-memory cache SetAsync/RefreshAsync and value consumption,or explicitly unchanged LoadAsync controls. Infinite-timeout opt-in only;no default,HTTP,remote-I/O or application-frequency benefit claim.",
        });
        if (mode == "first-use")
        {
            return 0;
        }
        if (mode == "characterize")
        {
            foreach (var profile in SessionProfiles.All)
            {
                using var fixture = new SessionFixture(profile);
                fixture.CaptureContract("first-wrapper");
                fixture.CaptureContract("repeated-wrapper");
            }
            SessionContracts.RunAsync().GetAwaiter().GetResult();
            Evidence.Write("characterization-completed", new
            {
                context, allSuccessful = true, actualTimedWrapperPaths = SessionProfiles.All.Length,
                actualRecordedProfileContracts = SessionProfiles.All.Length * 2, actualAdditionalProducerContracts = SessionContracts.Count,
            });
            Console.WriteLine($"F024:{SessionProfiles.All.Length} actual wrappers,{SessionProfiles.All.Length * 2} value contracts and{SessionContracts.Count} additional producer contracts passed.");

            return 0;
        }
        var job = Job.Default.WithId("SettingsPreserving-F024").WithToolchain(new SettingsPreservingEmitToolchain())
            .WithStrategy(RunStrategy.Throughput).WithIterationTime(TimeInterval.FromMilliseconds(100))
            .WithWarmupCount(3).WithIterationCount(8).WithUnrollFactor(1).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var summaries = BenchmarkSwitcher.FromTypes([typeof(SessionBenchmarks)]).Run(arguments.ToArray(), config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Count() == SessionProfiles.All.Length &&
            summaries[0].Reports.All(report => report.Success), "Every expected actual Session report must succeed.");
        Evidence.Write("completed", new
        {
            actualReports = SessionProfiles.All.Length, allSuccessful = true, context,
            singleActualOwnerProfile = true, comparisonAccountingRecordedExternallyBeforeLaunch = true,
        });

        return 0;
    }
}
