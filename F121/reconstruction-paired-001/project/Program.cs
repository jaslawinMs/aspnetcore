// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

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
using Perfolizer.Horology;
using Perfolizer.Mathematics.OutlierDetection;

[assembly: SupportedOSPlatform("windows")]

namespace AutoPerf;

internal static class Program
{
    public static async Task<int> Main(string[] args)
    {
        Evidence.Require(args.Length == 8,
            "Usage: AutoPerf.Benchmarks.dll <characterize|measure> <state-directory> <closure.json> <source-inputs.json> <source-root> <reports-directory> <variant> <authorization.json|none>");
        var mode = args[0];
        Evidence.Require(mode is "characterize" or "measure", "Require an explicit execution mode.");
        Evidence.StateDirectory = Path.GetFullPath(args[1]);
        Evidence.Require(Directory.Exists(Evidence.StateDirectory) && Directory.GetFileSystemEntries(Evidence.StateDirectory).Length == 0,
            "Require a fresh existing evidence directory.");
        Evidence.VerifyImage(Path.GetFullPath(args[2]));
        Evidence.VerifySources(Path.GetFullPath(args[3]), Path.GetFullPath(args[4]));
        Evidence.Runtime(mode + "-before");
        var job = Job.Default.WithId("SettingsPreserving-F121")
            .WithToolchain(new SettingsPreservingEmitToolchain()).WithStrategy(RunStrategy.Throughput)
            .WithIterationTime(TimeInterval.FromMilliseconds(100)).WithWarmupCount(3).WithIterationCount(8)
            .WithUnrollFactor(1).WithOutlierMode(OutlierMode.DontRemove).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var discovery = BenchmarkConverter.TypeToBenchmarks(typeof(CollectionBenchmarks), config);
        Evidence.Require(typeof(CollectionBenchmarks).IsPublic && !typeof(CollectionBenchmarks).IsSealed
            && discovery.BenchmarksCases.Length == 16
            && discovery.BenchmarksCases.Count(item => item.Descriptor.WorkloadMethod.Name == nameof(CollectionBenchmarks.CopyTo)) == 8
            && discovery.BenchmarksCases.Count(item => item.Descriptor.WorkloadMethod.Name == nameof(CollectionBenchmarks.UnchangedIndexOf)) == 8,
            "Require both actual public BDN methods for all eight predeclared profiles.");
        Evidence.Write("benchmarkdotnet-discovery-preflight", new
        {
            actualDiscoveredCases = discovery.BenchmarksCases.Length,
            actualTimingRunByThisPreflight = false, actualVariant = args[6]
        });
        // The pinned in-process emitter does not await asynchronous GlobalSetup.
        await CollectionScenario.PrepareBenchmarksAsync().ConfigureAwait(false);
        if (mode == "characterize")
        {
            Evidence.Require(args[7] == "none", "Untimed characterization must not consume a timing authorization.");
            await Characterization.RunAsync().ConfigureAwait(false);
            Evidence.Runtime(mode + "-after");

            return 0;
        }
        using var authorization = JsonDocument.Parse(File.ReadAllBytes(args[7]));
        var approved = authorization.RootElement;
        Evidence.Require(approved.GetProperty("candidate").GetString() == "F121"
            && approved.GetProperty("kind").GetString() == "paired-source-comparison"
            && approved.GetProperty("attempt").GetInt32() is >= 1 and <= 3,
            "Require an explicitly consumed F121 source-comparison authorization.");
        var binding = approved.GetProperty(args[6]);
        Evidence.Require(binding.GetProperty("closureSha256").GetString()
            == Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(args[2]))), "Authorization must bind this exact frozen image.");
        var summaries = BenchmarkSwitcher.FromTypes([typeof(CollectionBenchmarks)])
            .Run(["--filter", "*", "--artifacts", Path.GetFullPath(args[5])], config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Length == 16
            && summaries[0].Reports.All(report => report.Success), "Every predeclared profile must succeed.");
        Evidence.Write("completed", new
        {
            actualReports = 16, actualAllSuccessful = true, actualSourceComparison = true,
            actualVariant = args[6], actualAttempt = approved.GetProperty("attempt").GetInt32()
        });
        Evidence.Runtime(mode + "-after");

        return 0;
    }
}
