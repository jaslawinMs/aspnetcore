using System.Globalization;
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
using Microsoft.AspNetCore.Localization;
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
        var metadata = reader.DebugMetadataHeader ?? throw new InvalidOperationException("Actual portable-PDB header required.");
        var id = new BlobContentId(metadata.Id);
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

            return new { source, algorithm, checksum = Convert.ToHexString(expected), sha256 = Hash(source) };
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
    public static async Task<int> Main(string[] args)
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
        Evidence.StateDirectory = Path.Combine(arguments[artifactIndex + 1], "states");
        Directory.CreateDirectory(Evidence.StateDirectory);
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        var owner = typeof(RequestLocalizationMiddleware).Assembly;
        Evidence.SourceWitness(owner.Location, new[] { "RequestLocalizationMiddleware.cs", "RequestLocalizationOptions.cs",
            "QueryStringRequestCultureProvider.cs", "AcceptLanguageHeaderRequestCultureProvider.cs", "ProviderCultureResult.cs",
            "RequestCulture.cs", "RequestCultureFeature.cs", "RequestCultureProvider.cs" }.Select(name => Path.Combine(sources, "owner", name)).ToArray());
        Evidence.SourceWitness(typeof(Program).Assembly.Location, new[] { "Program.cs", "LocalizationSamples.cs", "ContractProbes.cs",
            "LocalizationBenchmarks.cs", "SettingsPreservingEmitToolchain.cs" }.Select(name => Path.Combine(sources, "harness", name)).ToArray());
        if (testAssembly is not null)
        {
            Evidence.SourceWitness(testAssembly, new[] { "RequestLocalizationMiddlewareTest.cs", "RequestLocalizationOptionsTest.cs",
                "QueryStringRequestCultureProviderTest.cs", "AcceptLanguageHeaderRequestCultureProviderTest.cs" }
                .Select(name => Path.Combine(sources, "test", name)).ToArray());
        }
        Evidence.Write("runtime", new
        {
            candidate = "F008", context, processId = Environment.ProcessId, runtime = Environment.Version.ToString(),
            ownerSha256 = Evidence.Hash(owner.Location), harnessSha256 = Evidence.Hash(typeof(Program).Assembly.Location),
            corelibSha256 = Evidence.Hash(typeof(object).Assembly.Location), serverGc = GCSettings.IsServerGC,
            initialSettings = Evidence.InitialSettings, sharedMachineNotIsolated = true,
            mode = "Original-only characterization/diagnostic;no candidate or before-after improvement.",
            measuredBoundary = "Repeated warm same-context actual Middleware.Invoke with real native Query/header provider plus minimal downstream reference/call-count observer;not new HTTP requests,network,query parsing throughput or production mix."
        });
        if (arguments.Contains("--characterize", StringComparer.Ordinal))
        {
            var checks = await ContractProbes.Run();
            foreach (var shape in Enum.GetValues<Shape>())
            {
                var benchmark = new LocalizationBenchmarks { Shape = shape };
                benchmark.Setup();
                await benchmark.Invoke();
                benchmark.Validate();
                checks++;
            }
            Evidence.Write("characterization-completed", new { context, actualChecks = checks, actualTimedSetupsPreflighted = 8, passed = true });
            Console.WriteLine($"F008:{checks} actual owner/provider contract probes including8 actual timed Setup/wrappers passed.");

            return 0;
        }
        var job = Job.Default.WithId("SettingsPreserving-F008-original-only").WithToolchain(new SettingsPreservingEmitToolchain())
            .WithStrategy(RunStrategy.Throughput).WithIterationTime(TimeInterval.FromMilliseconds(100))
            .WithWarmupCount(3).WithIterationCount(8).WithUnrollFactor(1).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var summaries = BenchmarkSwitcher.FromTypes([typeof(LocalizationBenchmarks)]).Run(arguments.ToArray(), config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Count() == 8 && summaries[0].Reports.All(report => report.Success),
            "Expected8 successful original-only diagnostic reports.");
        Evidence.Write("completed", new { actualReports = 8, allSuccessful = true, context, candidateProfiles = 0, pairedComparisons = 0 });

        return 0;
    }
}
