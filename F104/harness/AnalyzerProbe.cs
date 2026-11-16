using BenchmarkDotNet.Engines;
using System.Diagnostics;
using Microsoft.AspNetCore.Analyzers.RouteHandlers;

namespace AutoPerf;

internal static class AnalyzerProbe
{
    public static async Task RunAsync()
    {
        var observations = new List<object>();
        var resources = new List<object>();
        var freshCompilationResources = new List<object>();
        var producers = new List<object>();
        using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(5));
        foreach (var shape in Enum.GetValues<RouteWorkload>())
        {
            foreach (var mode in Enum.GetValues<DriverMode>())
            {
                var freshBefore = GC.GetTotalAllocatedBytes(precise: true);
                var freshStarted = Stopwatch.GetTimestamp();
                var workload = CompilationWorkload.Create(shape, mode);
                var firstDiagnostics = await workload.AnalyzeAsync(timeout.Token);
                var freshElapsed = Stopwatch.GetElapsedTime(freshStarted);
                var freshAfter = GC.GetTotalAllocatedBytes(precise: true);
                workload.WriteInputProof();
                var validatedFirst = workload.Validate(firstDiagnostics);
                freshCompilationResources.Add(new
                {
                    workload.Label,
                    actualFreshCompilations = 1,
                    actualCompletedDriverRuns = 1,
                    allocatedBefore = freshBefore,
                    allocatedAfter = freshAfter,
                    allocatedBytes = freshAfter - freshBefore,
                    elapsedTicks = freshElapsed.Ticks,
                    stopwatchFrequency = Stopwatch.Frequency,
                    actualDiagnostics = firstDiagnostics.Length,
                    beforeAnyPerCaseDriverWarmups = true,
                    freshProcessOrColdMetadataJitClaimed = false,
                    boundary = "Fresh source construction/parsing/compilation/real prerequisite-binding proof/first complete real analyzer driver. Shared metadata and process JIT may already be warm;not a timed optimization comparison."
                });
                observations.Add(new
                {
                    workload.Label,
                    diagnostics = validatedFirst,
                    workload.BoundRouteInvocations,
                    workload.LiteralRouteInvocations,
                    actualCompleteDriverRuns = 1
                });
                var observer = new ProducerProbe();
                var observed = CompilationWorkload.Create(shape, mode, analyzer: observer);
                observed.Validate(await observed.AnalyzeAsync(timeout.Token));
                producers.Add(observer.Validate(observed));
                for (var warmup = 0; warmup < 3; warmup++)
                {
                    workload.Validate(await workload.AnalyzeAsync(timeout.Token));
                }
                var bdnInitial = GcStats.ReadInitial();
                var before = GC.GetTotalAllocatedBytes(precise: true);
                var gen0 = GC.CollectionCount(0);
                var gen1 = GC.CollectionCount(1);
                var gen2 = GC.CollectionCount(2);
                const int runs = 10;
                var checksum = 0;
                for (var index = 0; index < runs; index++)
                {
                    var diagnostics = await workload.AnalyzeAsync(timeout.Token);
                    Evidence.Require(diagnostics.Length == workload.Expected.Count, "Real resource-driver diagnostic count changed.");
                    checksum += diagnostics.Length;
                }
                var after = GC.GetTotalAllocatedBytes(precise: true);
                var gen0Delta = GC.CollectionCount(0) - gen0;
                var gen1Delta = GC.CollectionCount(1) - gen1;
                var gen2Delta = GC.CollectionCount(2) - gen2;
                var bdnFinal = GcStats.ReadFinal();
                var bdn = (bdnFinal - bdnInitial).WithTotalOperations(runs);
                var bdnBytes = bdn.GetTotalAllocatedBytes(excludeAllocationQuantumSideEffects: false);
                Evidence.Require(checksum == runs * workload.Expected.Count && bdnBytes >= after - before,
                    "Actual completed checksum or enclosing BDN process-allocation accounting differs.");
                resources.Add(new
                {
                    workload.Label,
                    completeDriverRuns = runs,
                    expectedDiagnosticsPerRun = workload.Expected.Count,
                    checksum,
                    allocatedBefore = before,
                    allocatedAfter = after,
                    allocatedBytes = after - before,
                    bytesPerCompleteDriverRun = (after - before) / (double)runs,
                    gen0Collections = gen0Delta,
                    gen1Collections = gen1Delta,
                    gen2Collections = gen2Delta,
                    enclosingActualBdnGcHelperBytes = bdnBytes,
                    enclosingActualBdnGcHelperBytesPerRun = bdn.BytesAllocatedPerOperation,
                    enclosingActualBdnGcHelperExtraBytes = bdnBytes - (after - before),
                    actualBdnGcHelperSha256 = Evidence.Hash(typeof(GcStats).Assembly.Location),
                    compilationStartPoolFreshPerDriver = true,
                    boundary = "Precise process-wide managed allocation/worker threads/complete real drivers and diagnostics;not isolated dictionary or native allocation."
                });
            }
        }
        foreach (var mode in Enum.GetValues<DriverMode>())
        {
            foreach (var kind in new[] { "DifferentHttpMethods", "DistinctBuilders", "Conditional", "UnknownMetadata",
                "SafeNameMetadata", "SameMapGroup", "RequestDelegate", "NonLiteral", "PoolReuse", "ExplicitHandlerCast" })
            {
                var control = CompilationWorkload.CreateControl(kind, mode);
                control.WriteInputProof();
                observations.Add(new
                {
                    control.Label,
                    diagnostics = control.Validate(await control.AnalyzeAsync(timeout.Token)),
                    control.BoundRouteInvocations,
                    control.LiteralRouteInvocations
                });
            }
            var generated = CompilationWorkload.Create(RouteWorkload.SmallDuplicate, mode, generated: true);
            generated.WriteInputProof();
            observations.Add(new
            {
                generated.Label,
                diagnostics = generated.Validate(await generated.AnalyzeAsync(timeout.Token)),
                generated.BoundRouteInvocations,
                generated.LiteralRouteInvocations,
                unwrappedOwnerGeneratedCodeControl = true
            });
        }
        var shared = new RouteHandlerAnalyzer();
        var first = CompilationWorkload.Create(RouteWorkload.WideDuplicate, DriverMode.Concurrent, analyzer: shared);
        var second = CompilationWorkload.Create(RouteWorkload.WideDuplicate, DriverMode.Concurrent, padding: 3, analyzer: shared);
        first.WriteInputProof();
        second.WriteInputProof();
        var firstTask = first.AnalyzeAsync(timeout.Token);
        var secondTask = second.AnalyzeAsync(timeout.Token);
        await Task.WhenAll(firstTask, secondTask);
        observations.Add(new
        {
            label = "Same-analyzer-two-real-compilation-lifetimes",
            concurrentlyStartedDriverRuns = 2,
            sameAnalyzerInstance = true,
            first = first.Validate(await firstTask),
            second = second.Validate(await secondTask),
            sourcePaddingDifference = 3
        });
        Evidence.Write("actual-analyzer-contract-resources", new
        {
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId,
            observations,
            resources,
            freshCompilationResources,
            producers,
            actualEndpointMetadataAndCompletedDiagnostics = true,
            compilationStartPoolNotCarriedBetweenDifferentDriverRuns = true,
            nativeBrowserOrWholeBuildClaimed = false
        });
        Console.WriteLine("AUTOPERF_F104_PROBE " + Evidence.Compact(new
        {
            observations = observations.Count,
            resources = resources.Count,
            producerCases = producers.Count,
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256
        }));
    }
}
