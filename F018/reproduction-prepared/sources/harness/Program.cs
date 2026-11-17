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
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.OAuth;
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
            Require(expected.AsSpan().SequenceEqual(observed), "Actual source/PDB document differs: " + source);

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
            if (index < 0 || index + 1 >= arguments.Count)
            {
                throw new ArgumentException("Explicit option required: " + option);
            }
            var value = arguments[index + 1];
            arguments.RemoveRange(index, 2);

            return value;
        }
        var sources = RemoveOption("--sources");
        var context = RemoveOption("--context");
        var mode = RemoveOption("--mode");
        Evidence.Require(mode is "characterize" or "measure", "Explicit actual characterization/measurement mode required.");
        var artifactIndex = arguments.IndexOf("--artifacts");
        Evidence.Require(artifactIndex >= 0 && artifactIndex + 1 < arguments.Count && Path.IsPathRooted(arguments[artifactIndex + 1]) &&
            string.Equals(Path.GetFullPath(arguments[artifactIndex + 1]), arguments[artifactIndex + 1], StringComparison.OrdinalIgnoreCase),
            "Explicit absolute artifact directory required.");
        Evidence.StateDirectory = Path.Combine(arguments[artifactIndex + 1], "states");
        Evidence.Require(!Directory.Exists(Evidence.StateDirectory), "Do not overwrite existing actual native evidence.");
        Directory.CreateDirectory(Evidence.StateDirectory);
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        var owner = typeof(GoogleHandler).Assembly;
        var target = owner.GetCustomAttribute<TargetFrameworkAttribute>()?.FrameworkName;
        Evidence.Require(target == ".NETCoreApp,Version=v12.0" && Environment.Is64BitProcess, "Actual net12/x64 Google product required.");
        Evidence.SourceWitness(owner.Location, new[] { "GoogleHandler.cs", "GoogleOptions.cs" }
            .Select(name => Path.Combine(sources, "owner", name)).ToArray());
        Evidence.SourceWitness(typeof(OAuthTokenResponse).Assembly.Location, new[] { "OAuthCreatingTicketContext.cs", "OAuthTokenResponse.cs" }
            .Select(name => Path.Combine(sources, "owner", name)).ToArray());
        Evidence.SourceWitness(typeof(Program).Assembly.Location, new[] { "Program.cs", "GoogleFixture.cs", "GoogleBenchmarks.cs", "SettingsPreservingEmitToolchain.cs" }
            .Select(name => Path.Combine(sources, "harness", name)).ToArray());
        using var process = Process.GetCurrentProcess();
        var runtimeAssemblies = new[] { typeof(object).Assembly, typeof(HttpClient).Assembly, typeof(JsonDocument).Assembly, typeof(Job).Assembly }
            .Select(assembly => new
            {
                name = assembly.GetName().Name, path = assembly.Location, sha256 = Evidence.Hash(assembly.Location),
                informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
                fileVersion = FileVersionInfo.GetVersionInfo(assembly.Location).FileVersion,
            }).ToArray();
        Evidence.Write("runtime", new
        {
            candidate = "F018", context, mode, processId = process.Id, runtime = Environment.Version.ToString(),
            hostTargetFramework = typeof(Program).Assembly.GetCustomAttribute<TargetFrameworkAttribute>()?.FrameworkName,
            ownerTargetFramework = target, ownerPath = owner.Location, ownerSha256 = Evidence.Hash(owner.Location),
            harnessSha256 = Evidence.Hash(typeof(Program).Assembly.Location), runtimeAssemblies,
            serverGc = GCSettings.IsServerGC, initialSettings = Evidence.InitialSettings, actualX64Process = Environment.Is64BitProcess,
            sharedMachineNotIsolated = true,
            boundary = "Warm actual DI/options-initialized GoogleHandler via existing protected CreateTicketAsync;real HttpClient/HttpContent-produced buffering,claim actions,awaited event and ticket. Same external request/response cleanup. No external network/browser/full callback or production-frequency claim.",
        });
        if (mode == "characterize")
        {
            foreach (var profile in GoogleProfiles.All)
            {
                var benchmark = new GoogleBenchmarks { Case = profile.Name };
                benchmark.Setup();
                var result = benchmark.Exercise().GetAwaiter().GetResult();
                var expectedName = profile.InvalidUtf8 ? "caf\uFFFD \u03A9 \U0001F600\nname" : "caf\u00E9 \u03A9 \U0001F600\nname";
                var expected = profile.Status != System.Net.HttpStatusCode.OK ? -102 : profile.Body != "Object" ? -101 : 5 ^ expectedName.Length;
                Evidence.Require(result == expected, "The actual timed wrapper must return the consumed ticket/JSON/HTTP result.");
                Evidence.Write("wrapper-result", new { shape = profile.Name, observed = result, expected, matched = true });
                benchmark.Cleanup();
            }
            foreach (var shape in new[] { "Utf8Small", "Utf8Large16K", "Utf8Bom16K", "InvalidUtf8Small" })
            {
                foreach (var cancellation in new[] { "BeforeRequest", "DuringBuffer", "AfterBuffer" })
                {
                    using var fixture = new GoogleFixture(GoogleProfiles.All.Single(profile => profile.Name == shape), cancellation);
                    fixture.CaptureContract("cancellation").GetAwaiter().GetResult();
                }
            }
            Evidence.Write("characterization-completed", new
            {
                context, allSuccessful = true, actualTimedWrapperPaths = GoogleProfiles.All.Length,
                actualRecordedProfileContracts = GoogleProfiles.All.Length * 2, actualProducerCancellationContracts = 12,
            });
            Console.WriteLine($"F018:{GoogleProfiles.All.Length} actual Google wrappers,48 recorded profile contracts and12 real producer cancellation contracts passed.");

            return 0;
        }
        var job = Job.Default.WithId("SettingsPreserving-F018").WithToolchain(new SettingsPreservingEmitToolchain())
            .WithStrategy(RunStrategy.Throughput).WithIterationTime(TimeInterval.FromMilliseconds(100))
            .WithWarmupCount(3).WithIterationCount(8).WithUnrollFactor(1).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var summaries = BenchmarkSwitcher.FromTypes([typeof(GoogleBenchmarks)]).Run(arguments.ToArray(), config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Count() == GoogleProfiles.All.Length &&
            summaries[0].Reports.All(report => report.Success), "Every expected actual Google report must succeed.");
        Evidence.Write("completed", new
        {
            actualReports = GoogleProfiles.All.Length, allSuccessful = true, context,
            singleActualOwnerProfile = true, comparisonAccountingRecordedExternallyBeforeLaunch = true,
        });

        return 0;
    }
}
