using System.Globalization;
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
using Microsoft.AspNetCore.Authorization.Infrastructure;
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
            assembly, assemblySha256 = Hash(assembly), pdbSha256 = Hash(pdb), codeViewGuid = codeView.Guid, pdbGuid = id.Guid,
            stamp = id.Stamp, actualPePdbBindingMatched = true, documents, notCompleteBuildProvenanceOrMethodCoverage = true
        });
    }
}

internal static class Program
{
    private static readonly string[] OwnerSourceNames =
    [
        "ClaimsAuthorizationRequirement.cs", "AuthorizationPolicyBuilder.cs", "AuthorizationServiceExtensions.cs", "AuthorizationHandler.cs",
        "PassThroughAuthorizationHandler.cs", "DefaultAuthorizationService.cs", "DefaultAuthorizationServiceImpl.cs", "AuthorizationHandlerContext.cs",
        "DefaultAuthorizationHandlerContextFactory.cs", "DefaultAuthorizationHandlerProvider.cs", "DefaultAuthorizationEvaluator.cs",
        "AuthorizationServiceCollectionExtensions.cs", "AuthorizationPolicy.cs", "AuthorizationMetrics.cs", "LoggingExtensions.cs"
    ];

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
        var legacyImage = arguments.Contains("--legacy-image", StringComparer.Ordinal) ? RemoveOption("--legacy-image") : null;
        var standardImage = arguments.Contains("--standard-image", StringComparer.Ordinal) ? RemoveOption("--standard-image") : null;
        var artifactIndex = arguments.IndexOf("--artifacts");
        Evidence.Require(artifactIndex >= 0 && artifactIndex + 1 < arguments.Count && Path.IsPathFullyQualified(arguments[artifactIndex + 1]),
            "Explicit absolute artifact directory required.");
        Evidence.StateDirectory = Path.Combine(arguments[artifactIndex + 1], "states");
        Directory.CreateDirectory(Evidence.StateDirectory);
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        var owner = typeof(ClaimsAuthorizationRequirement).Assembly;
        var ownerSources = OwnerSourceNames.Select(name => Path.Combine(sources, "owner", name)).ToArray();
        Evidence.SourceWitness(owner.Location, ownerSources);
        Evidence.SourceWitness(typeof(Program).Assembly.Location, new[]
        {
            "Program.cs", "ClaimSamples.cs", "ContractProbes.cs", "ClaimBenchmarks.cs", "SettingsPreservingEmitToolchain.cs"
        }.Select(name => Path.Combine(sources, "harness", name)).ToArray());
        if (testAssembly is not null)
        {
            Evidence.SourceWitness(testAssembly, new[] { "ClaimsAuthorizationRequirementTests.cs", "DefaultAuthorizationServiceTests.cs" }
                .Select(name => Path.Combine(sources, "test", name)).ToArray());
        }
        foreach (var image in new[] { legacyImage, standardImage }.OfType<string>())
        {
            Evidence.SourceWitness(Path.Combine(image, "Microsoft.AspNetCore.Authorization.dll"), ownerSources);
            var executable = Path.Combine(image, legacyImage == image ? "AutoPerf.Compatibility.exe" : "AutoPerf.Compatibility.dll");
            Evidence.SourceWitness(executable, Path.Combine(sources, "compatibility", "Program.cs"),
                Path.Combine(sources, "harness", "ClaimSamples.cs"), Path.Combine(sources, "harness", "ContractProbes.cs"));
        }
        var ownerTargetFramework = owner.GetCustomAttributes(typeof(TargetFrameworkAttribute), false).Cast<TargetFrameworkAttribute>().Single().FrameworkName;
        Evidence.Require(ownerTargetFramework == ".NETCoreApp,Version=v12.0", "Timed/primary characterization owner must be actual freshly built net12 library.");
        Evidence.Write("runtime", new
        {
            candidate = "F010", context, processId = Environment.ProcessId, runtime = Environment.Version.ToString(), ownerTargetFramework,
            ownerSha256 = Evidence.Hash(owner.Location), ownerPdbSha256 = Evidence.Hash(Path.ChangeExtension(owner.Location, ".pdb")),
            harnessSha256 = Evidence.Hash(typeof(Program).Assembly.Location), harnessPdbSha256 = Evidence.Hash(Path.ChangeExtension(typeof(Program).Assembly.Location, ".pdb")),
            benchmarkDotNetSha256 = Evidence.Hash(typeof(BenchmarkSwitcher).Assembly.Location),
            corelibSha256 = Evidence.Hash(typeof(object).Assembly.Location), serverGc = GCSettings.IsServerGC,
            initialSettings = Evidence.InitialSettings, sharedMachineNotIsolated = true,
            measuredBoundary = "Repeated warm actual IAuthorizationService.AuthorizeAsync ->registered default service/requirement dispatch ->retained allowed-values matching. Existing failure paths eagerly format FailedRequirements/ToString even with no logger provider;this remains included. Builder/DI setup,claims/allowed inputs/context observers excluded from timing. No HTTP,network,new request/DI-scope or production-frequency claim."
        });
        if (arguments.Contains("--characterize", StringComparer.Ordinal))
        {
            var checks = await ContractProbes.Run(record => Evidence.Write("producer", record));
            foreach (var shape in Enum.GetValues<Shape>())
            {
                var benchmark = new ClaimBenchmarks { Shape = shape };
                benchmark.Setup();
                benchmark.Cleanup();
                checks++;
            }
            Evidence.Write("characterization-completed", new
            {
                context, actualChecks = checks, actualTimedSetupsPreflighted = 11, sharedContractChecks = checks - 11, passed = true
            });
            Console.WriteLine($"F010:{checks} actual public service/producer observations including11 exact timed Setup/task wrappers passed.");

            return 0;
        }
        Evidence.Require(arguments.Remove("--measure"), "An explicit measured-budget driver launch is required for any timing.");
        var job = Job.Default.WithId("SettingsPreserving-F010").WithToolchain(new SettingsPreservingEmitToolchain())
            .WithStrategy(RunStrategy.Throughput).WithIterationTime(TimeInterval.FromMilliseconds(100))
            .WithWarmupCount(3).WithIterationCount(8).WithUnrollFactor(1).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var summaries = BenchmarkSwitcher.FromTypes([typeof(ClaimBenchmarks)]).Run(arguments.ToArray(), config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Count() == 11 && summaries[0].Reports.All(report => report.Success),
            "Expected11 successful reports for this actual public-service role profile.");
        Evidence.Write("completed", new { actualReports = 11, allSuccessful = true, context });

        return 0;
    }
}
