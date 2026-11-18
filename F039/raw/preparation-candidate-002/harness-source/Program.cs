// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Runtime.Versioning;
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
    public static int Main(string[] args)
    {
        Evidence.Require(args.Length == 6, "Usage: AutoPerf.Benchmarks.dll <characterize|measure> <original|candidate> <state-directory> <closure.json> <source-directory> <reports-directory>");
        var mode = args[0];
        Evidence.Require(mode is "characterize" or "measure" && args[1] is "original" or "candidate",
            "Require an explicit valid mode and source variant.");
        Evidence.StateDirectory = Path.GetFullPath(args[2]);
        Evidence.Variant = args[1];
        Evidence.Require(Directory.Exists(Evidence.StateDirectory) && Directory.GetFiles(Evidence.StateDirectory).Length == 0,
            "Require a fresh, existing native evidence directory.");
        Evidence.VerifyImage(Path.GetFullPath(args[3]));
        Evidence.SourceWitness(Path.GetFullPath(args[4]));
        Evidence.Runtime(mode + "-before");
        var job = Job.Default.WithId("SettingsPreserving-F039-SourceComparison")
            .WithToolchain(new SettingsPreservingEmitToolchain()).WithStrategy(RunStrategy.Throughput)
            .WithIterationTime(TimeInterval.FromMilliseconds(100)).WithWarmupCount(3).WithIterationCount(8)
            .WithUnrollFactor(1).WithOutlierMode(OutlierMode.DontRemove).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var discovery = BenchmarkConverter.TypeToBenchmarks(typeof(TempDataContainsBenchmarks), config);
        Evidence.Require(typeof(TempDataContainsBenchmarks).IsPublic && !typeof(TempDataContainsBenchmarks).IsSealed &&
            discovery.BenchmarksCases.Length == 40, "Require a BDN-eligible fixture and all forty cases from actual public BDN discovery before any timing.");
        Evidence.Write("benchmarkdotnet-discovery-preflight", new { actualEligiblePublicNonSealedType = true,
            actualDiscoveredCases = discovery.BenchmarksCases.Length, actualTimingRunByThisPreflight = false });
        if (mode == "characterize")
        {
            Characterization.RunAsync().GetAwaiter().GetResult();
            Evidence.Runtime(mode + "-after");

            return 0;
        }
        var summaries = BenchmarkSwitcher.FromTypes([typeof(TempDataContainsBenchmarks)])
            .Run(["--filter", "*", "--artifacts", Path.GetFullPath(args[5])], config).ToArray();
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Length == 40 &&
            summaries[0].Reports.All(report => report.Success), "Every predeclared actual TempData profile must succeed.");
        Evidence.Write("completed", new { actualReports = 40, actualAllSuccessful = true,
            actualSourceComparisonMember = true, actualGainClaimed = false });
        Evidence.Runtime(mode + "-after");

        return 0;
    }
}
