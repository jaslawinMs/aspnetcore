// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

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
using Microsoft.AspNetCore.Server.HttpSys;
using Perfolizer.Horology;
using Perfolizer.Mathematics.OutlierDetection;

[assembly: SupportedOSPlatform("windows")]

namespace AutoPerf;

internal static class Evidence
{
    private static int _sequence;
    public static string StateDirectory { get; set; } = "";
    public static string ClosurePath { get; set; } = "";
    public static string Variant { get; set; } = "";
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
            Require(expected.AsSpan().SequenceEqual(observed), "Actual source/PDB document differs: " + source);

            return new { source, algorithm, checksum = Convert.ToHexString(expected), sha256 = Hash(source) };
        }).ToArray();
        Write("source-pdb-" + Path.GetFileNameWithoutExtension(assembly), new
        {
            assemblySha256 = Hash(assembly),
            pdbSha256 = Hash(pdb),
            codeViewGuid = codeView.Guid,
            pdbGuid = id.Guid,
            stamp = id.Stamp,
            actualPePdbBindingMatched = true,
            documents,
            notCompleteBuildProvenanceOrMethodCoverage = true,
        });
    }

    public static void Runtime(string mode)
    {
        Write("runtime-" + mode, new
        {
            candidate = "F032",
            mode,
            variant = Variant,
            processId = Environment.ProcessId,
            runtime = Environment.Version.ToString(),
            serverGc = GCSettings.IsServerGC,
            initialSettings = InitialSettings,
            actualX64Process = Environment.Is64BitProcess,
            actualClosureSha256 = Hash(ClosurePath),
            sharedMachineNotIsolated = true,
            boundary = "Actual UseHttpSys,accepted ephemeral loopback request,ResponseStream/OnResponseStart/OnStarting and native response. Full-request profiles include actual client/dispatch/fixture/wire consumption. Prepared-live profiles invoke one flush on a real already-started response with the request held alive;no new network operation per flush. Explicit synchronous-IO opt-in,default rejection separately characterized. Not isolated GetResult cost,production frequency/throughput or request-abort producer proof.",
            runtimeAssemblies = AppDomain.CurrentDomain.GetAssemblies().Where(assembly => !assembly.IsDynamic &&
                !string.IsNullOrEmpty(assembly.Location)).Select(assembly => new
                {
                    name = assembly.GetName().Name,
                    path = assembly.Location,
                    sha256 = Hash(assembly.Location),
                    informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
                    fileVersion = FileVersionInfo.GetVersionInfo(assembly.Location).FileVersion,
                }).OrderBy(assembly => assembly.name, StringComparer.Ordinal).ToArray(),
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
            Evidence.Require(index >= 0 && index + 1 < arguments.Count, "Explicit option required: " + option);
            var value = arguments[index + 1];
            arguments.RemoveRange(index, 2);

            return value;
        }
        var sources = RemoveOption("--sources");
        var mode = RemoveOption("--mode");
        Evidence.ClosurePath = RemoveOption("--closure");
        Evidence.Require(mode is "characterize" or "measure", "Require untimed contracts or a budgeted comparison member.");
        var artifactIndex = arguments.IndexOf("--artifacts");
        Evidence.Require(artifactIndex >= 0 && artifactIndex + 1 < arguments.Count && Path.IsPathRooted(arguments[artifactIndex + 1]),
            "Explicit absolute artifact directory required.");
        Evidence.StateDirectory = Path.Combine(arguments[artifactIndex + 1], "states");
        Evidence.Require(!Directory.Exists(Evidence.StateDirectory), "Do not overwrite existing actual evidence.");
        Directory.CreateDirectory(Evidence.StateDirectory);
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        using var closure = JsonDocument.Parse(File.ReadAllBytes(Evidence.ClosurePath));
        Evidence.Require(closure.RootElement.GetProperty("candidate").GetString() == "F032", "Require the actual F032 closure.");
        Evidence.Variant = closure.RootElement.GetProperty("variant").GetString() ?? throw new InvalidOperationException("Actual variant absent.");
        Evidence.Require(Evidence.Variant is "original" or "candidate", "Require an explicit actual source variant.");
        var output = Path.GetDirectoryName(typeof(Program).Assembly.Location) ?? throw new InvalidOperationException("Actual harness directory required.");
        var declared = closure.RootElement.GetProperty("files").EnumerateArray().Select(file =>
        {
            var relative = file.GetProperty("path").GetString() ?? throw new InvalidOperationException("Closure path absent.");
            var actual = Path.GetFullPath(Path.Combine(output, relative));
            Evidence.Require(actual.StartsWith(output + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase),
                "A declared closure file escapes the actual consumer directory.");
            Evidence.Require(Evidence.Hash(actual) == file.GetProperty("sha256").GetString(), "Actual consumer closure differs: " + relative);

            return relative;
        }).Order(StringComparer.Ordinal).ToArray();
        var discovered = Directory.EnumerateFiles(output, "*", SearchOption.AllDirectories)
            .Select(file => Path.GetRelativePath(output, file)).Order(StringComparer.Ordinal).ToArray();
        Evidence.Require(declared.SequenceEqual(discovered, StringComparer.Ordinal), "Actual consumer closure file set differs.");
        Evidence.Require(OperatingSystem.IsWindows() && Environment.Is64BitProcess && Environment.Version.Major == 12 &&
            Evidence.Hash(typeof(object).Assembly.Location) == "0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4",
            "Require the pinned actual Windows/net12/x64 runtime.");
        var owner = typeof(HttpSysOptions).Assembly;
        Evidence.Require(owner.GetCustomAttribute<TargetFrameworkAttribute>()?.FrameworkName == ".NETCoreApp,Version=v12.0" &&
            Path.GetDirectoryName(owner.Location) == output, "Load actual HTTP.sys owner from the frozen consumer, not the shared framework.");
        Evidence.SourceWitness(owner.Location, new[]
        {
            "ResponseStream.cs", "RequestContext.FeatureCollection.cs", "ResponseBody.cs", "MessagePump.cs",
        }.Select(name => Path.Combine(sources, "httpsys", name)).ToArray());
        Evidence.SourceWitness(typeof(Program).Assembly.Location, new[]
        {
            "Program.cs", "HttpSysRendering.cs", "FlushContracts.cs", "FlushBenchmarks.cs", "SettingsPreservingEmitToolchain.cs",
        }.Select(name => Path.Combine(sources, "harness", name)).ToArray());
        Evidence.Runtime(mode + "-before");
        if (mode == "characterize")
        {
            await FlushContracts.RunAsync().ConfigureAwait(false);
            Evidence.Write("characterization-completed", new
            {
                actualCompletedProfiles = FlushContracts.Profiles.Length,
                actualAdditionalProducerContracts = FlushContracts.AdditionalProducerContracts,
                actualAllSuccessful = true,
                actualRealHttpSysHostAndAcceptedRequest = true,
                directMockedStartTaskOrNativeRequestContext = false,
                timing = false,
            });
            Evidence.Runtime(mode + "-after");
            Console.WriteLine("F032:6completed profiles and12additional real HTTP.sys/OnStarting producer contracts passed.");

            return 0;
        }
        var job = Job.Default.WithId("SettingsPreserving-F032")
            .WithToolchain(new SettingsPreservingEmitToolchain()).WithStrategy(RunStrategy.Throughput)
            .WithIterationTime(TimeInterval.FromMilliseconds(100)).WithWarmupCount(3).WithIterationCount(8)
            .WithUnrollFactor(1).WithOutlierMode(OutlierMode.DontRemove).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var summaries = BenchmarkSwitcher.FromTypes([typeof(FlushBenchmarks)]).Run(arguments.ToArray(), config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Length == FlushContracts.Profiles.Length &&
            summaries[0].Reports.All(report => report.Success), "Every predeclared comparison profile must succeed.");
        Evidence.Write("completed", new { actualReports = FlushContracts.Profiles.Length, actualAllSuccessful = true, variant = Evidence.Variant });
        Evidence.Runtime(mode + "-after");

        return 0;
    }
}
