using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime;
using System.Runtime.Versioning;
using System.Security.Cryptography;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Engines;
using BenchmarkDotNet.Exporters.Csv;
using BenchmarkDotNet.Exporters.Json;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.DataProtection.AuthenticatedEncryption;
using Newtonsoft.Json;
using Perfolizer.Horology;

namespace AutoPerf;

internal static class Evidence
{
    private static int _sequence;
    public static string StateDirectory { get; set; } = "";
    public static object InitialSettings { get; } = SettingsPreservingEmitToolchain.ReadSettings();
    public static string Hash(string file) => Hex(HashBytes(File.ReadAllBytes(file), sha1: false));
    public static string Compact(object value) => JsonConvert.SerializeObject(value);
    private static string Hex(byte[] bytes) => BitConverter.ToString(bytes).Replace("-", "");

    private static byte[] HashBytes(byte[] bytes, bool sha1)
    {
        using HashAlgorithm algorithm = sha1 ? SHA1.Create() : SHA256.Create();

        return algorithm.ComputeHash(bytes);
    }

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
            JsonConvert.SerializeObject(value, Formatting.Indented));
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
            var observed = algorithm == new Guid("8829d00f-11b8-4213-878b-770e8597ac16") ? HashBytes(bytes, sha1: false)
                : algorithm == new Guid("ff1816ec-aa5e-4d10-87f7-6f4963833460") ? HashBytes(bytes, sha1: true)
                : throw new InvalidOperationException("Unsupported actual portable-PDB document checksum.");
            Require(expected.AsSpan().SequenceEqual(observed), "Actual source/PDB document differs: " + source);

            return new { source, algorithm, checksum = Hex(expected), sha256 = Hash(source) };
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
        Evidence.Require(!Directory.Exists(Evidence.StateDirectory), "Do not overwrite existing native state evidence.");
        Directory.CreateDirectory(Evidence.StateDirectory);
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        var owner = typeof(ManagedAuthenticatedEncryptorFactory).Assembly;
        var target = owner.GetCustomAttribute<TargetFrameworkAttribute>()?.FrameworkName;
#if NETFRAMEWORK
        Evidence.Require(target == ".NETFramework,Version=v4.6.2", "Only the actual legacy net462 owner is allowed in the Framework host.");
#else
        Evidence.Require(target == ".NETStandard,Version=v2.0", "Only the actual legacy netstandard2.0 owner is allowed in the net12 compatibility host.");
#endif
        Evidence.Require(Environment.Is64BitProcess, "Both actual benchmark hosts must execute as x64.");
        Evidence.SourceWitness(owner.Location, new[]
        {
            "ManagedAuthenticatedEncryptor.cs", "ManagedAuthenticatedEncryptorFactory.cs",
            "ManagedAuthenticatedEncryptorConfiguration.cs", "ManagedAuthenticatedEncryptorDescriptor.cs",
            "Secret.cs", "IAuthenticatedEncryptor.cs", "IKey.cs",
        }.Select(name => Path.Combine(sources, "owner", name)).ToArray());
        Evidence.SourceWitness(typeof(Program).Assembly.Location, new[]
        {
            "Program.cs", "DecryptionFixture.cs", "DecryptionBenchmarks.cs", "SettingsPreservingEmitToolchain.cs",
        }.Select(name => Path.Combine(sources, "harness", name)).ToArray());
        using var process = Process.GetCurrentProcess();
        Evidence.Write("runtime", new
        {
            candidate = "F016", context, mode, processId = process.Id, runtime = Environment.Version.ToString(),
            hostTargetFramework = typeof(Program).Assembly.GetCustomAttribute<TargetFrameworkAttribute>()?.FrameworkName,
            ownerTargetFramework = target, ownerPath = owner.Location, ownerSha256 = Evidence.Hash(owner.Location),
            harnessSha256 = Evidence.Hash(typeof(Program).Assembly.Location), corelibSha256 = Evidence.Hash(typeof(object).Assembly.Location),
            benchmarkDotNetSha256 = Evidence.Hash(typeof(Job).Assembly.Location),
            serverGc = GCSettings.IsServerGC, initialSettings = Evidence.InitialSettings, sharedMachineNotIsolated = true,
            actualCorelib = typeof(object).Assembly.Location, actualCorelibFileVersion = FileVersionInfo.GetVersionInfo(typeof(object).Assembly.Location).FileVersion,
            actualX64Process = Environment.Is64BitProcess, modernNetProductPathTimingClaimed = false,
            boundary = "Warm actual public-factory-created legacy managed Decrypt of an actual Encrypt-produced fixed payload; returned byte[] consumed. Factory/key/Mock/input/payload production and validation outside timing. No per-call RNG/key-ring/serialization/storage/network or production-frequency claim.",
        });
        if (mode == "characterize")
        {
            using (var fixture = new DecryptionFixture(Shape.Aes256Sha256_P17))
            {
                fixture.ValidateArguments();
            }
            foreach (var shape in (Shape[])Enum.GetValues(typeof(Shape)))
            {
                var benchmark = new DecryptionBenchmarks { Shape = shape };
                benchmark.Setup();
                benchmark.ValidateReturnedPlaintext(benchmark.Decrypt());
                benchmark.Cleanup();
            }
            Evidence.Write("characterization-completed", new
            {
                context, allSuccessful = true, actualTimedWrapperPaths = Enum.GetValues(typeof(Shape)).Length,
                nativeRoundtripRecords = Enum.GetValues(typeof(Shape)).Length * 3, argumentContractCases = 3,
            });
            Console.WriteLine($"F016:{Enum.GetValues(typeof(Shape)).Length} actual legacy Decrypt wrappers,63 native roundtrips and3 argument contracts passed.");

            return 0;
        }
        var job = Job.Default.WithId("SettingsPreserving-F016").WithToolchain(new SettingsPreservingEmitToolchain())
            .WithStrategy(RunStrategy.Throughput).WithIterationTime(TimeInterval.FromMilliseconds(100))
            .WithWarmupCount(3).WithIterationCount(8).WithUnrollFactor(1).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var summaries = BenchmarkSwitcher.FromTypes([typeof(DecryptionBenchmarks)]).Run(arguments.ToArray(), config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Count() == Enum.GetValues(typeof(Shape)).Length &&
            summaries[0].Reports.All(report => report.Success), "Every expected actual legacy decryption report must succeed.");
        Evidence.Write("completed", new
        {
            actualReports = Enum.GetValues(typeof(Shape)).Length, allSuccessful = true, context,
            singleActualOwnerProfile = true, comparisonAccountingRecordedExternallyBeforeLaunch = true,
        });

        return 0;
    }
}
