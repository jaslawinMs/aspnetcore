using System.Globalization;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Engines;
using BenchmarkDotNet.Exporters.Csv;
using BenchmarkDotNet.Exporters.Json;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Server;
using Perfolizer.Horology;

namespace AutoPerf;

internal static class Evidence
{
    private static int _sequence;
    public static string StateDirectory { get; set; } = "";
    public static string InputDirectory { get; set; } = "";
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
        var sequence = Interlocked.Increment(ref _sequence);
        File.WriteAllText(Path.Combine(StateDirectory, $"{sequence:D4}-{name}.json"),
            JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = true }));
    }

    public static void SourceWitness(string assembly, params string[] sources)
    {
        var pdb = Path.ChangeExtension(assembly, ".pdb");
        using var pe = new PEReader(File.OpenRead(assembly));
        using var provider = MetadataReaderProvider.FromPortablePdbStream(File.OpenRead(pdb));
        var reader = provider.GetMetadataReader();
        var id = new BlobContentId(reader.DebugMetadataHeader!.Id);
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
            Require(expected.AsSpan().SequenceEqual(observed), "Actual source/PDB document bytes differ:" + source);

            return new { source, document = reader.GetString(document.Name), algorithm, checksum = Convert.ToHexString(expected), sha256 = Hash(source) };
        }).ToArray();
        Write("source-pdb-" + Path.GetFileNameWithoutExtension(assembly), new
        {
            assemblySha256 = Hash(assembly), pdbSha256 = Hash(pdb), codeViewGuid = codeView.Guid, pdbGuid = id.Guid,
            stamp = id.Stamp, actualPePdbBindingMatched = true, documents, notCompleteBuildProvenanceOrMethodCoverage = true
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
            if (index < 0 || index + 1 >= arguments.Count)
            {
                throw new ArgumentException("Explicit option required:" + option);
            }
            var value = arguments[index + 1];
            arguments.RemoveRange(index, 2);

            return value;
        }
        var sources = RemoveOption("--sources");
        var context = RemoveOption("--context");
        var testAssembly = arguments.Contains("--test-assembly", StringComparer.Ordinal) ? RemoveOption("--test-assembly") : null;
        var artifactIndex = arguments.IndexOf("--artifacts");
        Evidence.Require(artifactIndex >= 0 && artifactIndex + 1 < arguments.Count && Path.IsPathFullyQualified(arguments[artifactIndex + 1]),
            "Explicit absolute artifact directory required.");
        var artifacts = arguments[artifactIndex + 1];
        Evidence.StateDirectory = Path.Combine(artifacts, "states");
        Evidence.InputDirectory = Path.Combine(artifacts, "inputs");
        Directory.CreateDirectory(Evidence.StateDirectory);
        Directory.CreateDirectory(Evidence.InputDirectory);
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        var owner = typeof(CircuitOptions).Assembly;
        Evidence.SourceWitness(owner.Location, Path.Combine(sources, "owner", "ServerComponentDeserializer.cs"),
            Path.Combine(sources, "owner", "ComponentParameterDeserializer.cs"), Path.Combine(sources, "owner", "ServerComponentSerializer.cs"),
            Path.Combine(sources, "owner", "ComponentMarker.cs"), Path.Combine(sources, "owner", "RootComponentOperation.cs"));
        Evidence.SourceWitness(typeof(Program).Assembly.Location, Path.Combine(sources, "harness", "Program.cs"),
            Path.Combine(sources, "harness", "ServerAdapter.cs"), Path.Combine(sources, "harness", "BatchSamples.cs"),
            Path.Combine(sources, "harness", "RootBatchBenchmarks.cs"), Path.Combine(sources, "harness", "SettingsPreservingEmitToolchain.cs"));
        if (testAssembly is not null)
        {
            Evidence.SourceWitness(testAssembly, Path.Combine(sources, "test", "ServerComponentDeserializerTest.cs"),
                Path.Combine(sources, "test", "ServerComponentDeserializerTest.Unions.cs"));
        }
        Evidence.Write("runtime", new
        {
            candidate = "F007", context, processId = Environment.ProcessId, runtime = Environment.Version.ToString(),
            ownerSha256 = Evidence.Hash(owner.Location), harnessSha256 = Evidence.Hash(typeof(Program).Assembly.Location),
            componentsSha256 = Evidence.Hash(typeof(ComponentBase).Assembly.Location), corelibSha256 = Evidence.Hash(typeof(object).Assembly.Location),
            ownerReferences = owner.GetReferencedAssemblies().Select(reference => reference.FullName),
            initialSettings = Evidence.InitialSettings, serverGc = GCSettings.IsServerGC,
            publicDefaultMaximumRootComponents = new CircuitRootComponentOptions().MaxJSRootComponents,
            measuredBoundary = "Full actual JSON batch deserializer,including JSON-created actual Server DTOs and sequential duplicate/error checks,through one cached expression adapter. Remove-only or marker-disabled resume parser;full marker/parameter/state producer characterized separately. Not circuit dispatch,browser rendering or production batch-frequency evidence.",
            sharedMachineNotIsolated = true
        });
        if (arguments.Contains("--characterize", StringComparer.Ordinal))
        {
            using var adapter = new ServerAdapter();
            Evidence.Write("actual-type-identities", adapter.TypeIdentity());
            var count = BatchSamples.Characterize(adapter);
            foreach (var shape in Enum.GetValues<Shape>())
            {
                var benchmark = new RootBatchBenchmarks { Shape = shape };
                benchmark.Setup();
                benchmark.Cleanup();
                count++;
            }
            Evidence.Write("characterization-completed", new { context, actualChecks = count, actualTimedSetupsPreflighted = 22, passed = true });
            Console.WriteLine($"F007:{count} full-owner JSON/marker/parameter/order/log/state checks passed.");

            return 0;
        }
        var job = Job.Default.WithId("SettingsPreserving-F007").WithToolchain(new SettingsPreservingEmitToolchain())
            .WithStrategy(RunStrategy.Throughput).WithIterationTime(TimeInterval.FromMilliseconds(100))
            .WithWarmupCount(3).WithIterationCount(8).WithUnrollFactor(1).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var summaries = BenchmarkSwitcher.FromTypes([typeof(RootBatchBenchmarks)]).Run(arguments.ToArray(), config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Count() == 22 && summaries[0].Reports.All(report => report.Success),
            "Expected22 successful full-owner benchmark reports.");
        Evidence.Write("completed", new { actualReports = 22, allSuccessful = true, context });

        return 0;
    }
}
