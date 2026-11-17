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
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
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
        Evidence.Require(firstShape is null || SignInProfiles.FirstObserved.Contains(firstShape, StringComparer.Ordinal),
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
        var owner = typeof(SignInManager<BenchmarkUser>).Assembly;
        Evidence.Require(Evidence.Hash(owner.Location) == expectedOwner, "The actual loaded Identity owner differs.");
        var target = owner.GetCustomAttribute<TargetFrameworkAttribute>()?.FrameworkName;
        Evidence.Require(target == ".NETCoreApp,Version=v12.0" && Environment.Is64BitProcess, "Actual net12/x64 Identity product required.");
        if (firstShape is not null)
        {
            var allocatedBefore = GC.GetAllocatedBytesForCurrentThread();
            var started = Stopwatch.GetTimestamp();
            using var fixture = new SignInFixture(firstShape);
            var operation = fixture.ExerciseAsync();
            Evidence.Require(operation.IsCompletedSuccessfully, "The prepared first public wrapper unexpectedly yielded.");
            var observed = operation.GetAwaiter().GetResult();
            var elapsedTicks = Stopwatch.GetTimestamp() - started;
            var allocated = GC.GetAllocatedBytesForCurrentThread() - allocatedBefore;
            Evidence.Require(observed == fixture.ExpectedConsumption, "The first actual public display-name consumption differs.");
            Evidence.Write("first-observed-public-call", new
            {
                context, profile = firstShape, observed, actualElapsedTicks = elapsedTicks,
                stopwatchFrequency = Stopwatch.Frequency, actualAllocatedBytes = allocated,
                boundary = "First fixture/provider/DI/UserManager construction and actual public GetExternalLoginInfoAsync. Includes JIT,metadata and fixture costs. Prepared authentication-result service,not a full login,cookie or HTTP request.",
                comparisonAccountingRecordedExternallyBeforeLaunch = true,
            });
        }
        Evidence.SourceWitness(owner.Location, new[] { "SignInManager.cs", "ExternalLoginInfo.cs" }
            .Select(name => Path.Combine(sources, "owner", name)).ToArray());
        Evidence.SourceWitness(typeof(AuthenticationSchemeProvider).Assembly.Location,
            Path.Combine(sources, "provider", "AuthenticationSchemeProvider.cs"));
        Evidence.SourceWitness(typeof(Program).Assembly.Location, new[]
        {
            "Program.cs", "SignInFixture.cs", "SignInBenchmarks.cs", "SignInContracts.cs", "SettingsPreservingEmitToolchain.cs",
        }.Select(name => Path.Combine(sources, "harness", name)).ToArray());
        var runtimeAssemblies = new[]
        {
            typeof(object).Assembly, typeof(AuthenticationSchemeProvider).Assembly,
            typeof(UserManager<BenchmarkUser>).Assembly, typeof(Job).Assembly,
        }.Select(assembly => new
        {
            name = assembly.GetName().Name, path = assembly.Location, sha256 = Evidence.Hash(assembly.Location),
            informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
            fileVersion = FileVersionInfo.GetVersionInfo(assembly.Location).FileVersion,
        }).ToArray();
        Evidence.Write("runtime", new
        {
            candidate = "F028", context, mode, processId = Environment.ProcessId, runtime = Environment.Version.ToString(),
            ownerTargetFramework = target, ownerPath = owner.Location, ownerSha256 = Evidence.Hash(owner.Location),
            harnessSha256 = Evidence.Hash(typeof(Program).Assembly.Location), runtimeAssemblies,
            serverGc = GCSettings.IsServerGC, initialSettings = Evidence.InitialSettings,
            actualX64Process = Environment.Is64BitProcess, actualClosureSha256 = Evidence.Hash(closurePath),
            actualClosureFileCount = declared.Length, sharedMachineNotIsolated = true,
            boundary = "Actual public SignInManager.GetExternalLoginInfoAsync and real default/derived scheme provider. Prepared successful/no-result IAuthenticationService seam. Not a complete external login,cookie,HTTP/network or application-frequency benchmark.",
        });
        if (mode == "first-use")
        {
            return 0;
        }
        if (mode == "characterize")
        {
            foreach (var profile in SignInProfiles.All)
            {
                using var fixture = new SignInFixture(profile);
                fixture.CaptureContract("first-wrapper");
                fixture.CaptureContract("repeated-wrapper");
            }
            SignInContracts.RunAsync().GetAwaiter().GetResult();
            Evidence.Write("characterization-completed", new
            {
                context, allSuccessful = true, actualTimedWrapperPaths = SignInProfiles.All.Length,
                actualRecordedProfileContracts = SignInProfiles.All.Length * 2, actualAdditionalProducerContracts = SignInContracts.Count,
            });
            Console.WriteLine($"F028:{SignInProfiles.All.Length} actual wrappers,{SignInProfiles.All.Length * 2} value contracts and{SignInContracts.Count} additional producer contracts passed.");

            return 0;
        }
        var job = Job.Default.WithId("SettingsPreserving-F028").WithToolchain(new SettingsPreservingEmitToolchain())
            .WithStrategy(RunStrategy.Throughput).WithIterationTime(TimeInterval.FromMilliseconds(100))
            .WithWarmupCount(3).WithIterationCount(8).WithUnrollFactor(1).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var summaries = BenchmarkSwitcher.FromTypes([typeof(SignInBenchmarks)]).Run(arguments.ToArray(), config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Count() == SignInProfiles.All.Length &&
            summaries[0].Reports.All(report => report.Success), "Every expected actual Identity report must succeed.");
        Evidence.Write("completed", new
        {
            actualReports = SignInProfiles.All.Length, allSuccessful = true, context,
            singleActualOwnerProfile = true, comparisonAccountingRecordedExternallyBeforeLaunch = true,
        });

        return 0;
    }
}
