using BenchmarkDotNet.Engines;
using Microsoft.AspNetCore.Components.Analyzers;

namespace AutoPerf;

internal static class AnalyzerProbe
{
    public static async Task RunAsync()
    {
        var observations = new List<object>();
        var resources = new List<object>();
        var producers = new List<object>();
        using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(5));
        foreach (var shape in Enum.GetValues<ComponentWorkload>())
        {
            foreach (var mode in Enum.GetValues<DriverMode>())
            {
                var workload = CompilationWorkload.Create(shape, mode);
                workload.WriteInputProof();
                var diagnostics = workload.Validate(await workload.AnalyzeAsync(timeout.Token));
                observations.Add(new
                {
                    workload.Label,
                    diagnostics,
                    workload.Components,
                    workload.FactoryInvocations,
                    workload.HandlerTargets,
                    workload.BoundStateCalls,
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
                var checksum = 0;
                const int runs = 10;
                for (var index = 0; index < runs; index++)
                {
                    var completed = await workload.AnalyzeAsync(timeout.Token);
                    Evidence.Require(completed.Length == workload.Expected.Count, "Actual resource-caliper diagnostic count changed.");
                    checksum += completed.Length;
                }
                var after = GC.GetTotalAllocatedBytes(precise: true);
                var gen0Delta = GC.CollectionCount(0) - gen0;
                var gen1Delta = GC.CollectionCount(1) - gen1;
                var gen2Delta = GC.CollectionCount(2) - gen2;
                var bdnFinal = GcStats.ReadFinal();
                var bdnDelta = (bdnFinal - bdnInitial).WithTotalOperations(runs);
                var bdnBytes = bdnDelta.GetTotalAllocatedBytes(excludeAllocationQuantumSideEffects: false);
                Evidence.Require(checksum == runs * workload.Expected.Count, "Resource-caliper complete-run checksum differs.");
                Evidence.Require(bdnBytes >= after - before,
                    "Actual pinned BDN GC helper missed allocations recorded by the enclosed process-wide caliper.");
                resources.Add(new
                {
                    workload.Label,
                    completeDriverRuns = runs,
                    checksum,
                    expectedDiagnosticsPerRun = workload.Expected.Count,
                    allocatedBefore = before,
                    allocatedAfter = after,
                    allocatedBytes = after - before,
                    bytesPerCompleteDriverRun = (after - before) / (double)runs,
                    gen0Collections = gen0Delta,
                    gen1Collections = gen1Delta,
                    gen2Collections = gen2Delta,
                    enclosingActualBdnGcHelperBytes = bdnBytes,
                    enclosingActualBdnGcHelperBytesPerRun = bdnDelta.BytesAllocatedPerOperation,
                    enclosingActualBdnGcHelperExtraBytes = bdnBytes - (after - before),
                    actualBdnGcHelperSha256 = Evidence.Hash(typeof(GcStats).Assembly.Location),
                    boundary = "Precise process-wide managed allocations across actual completed drivers;includes worker threads,driver/tasks/diagnostics/metadata/cache work,not isolated dictionary bytes."
                });
            }
        }
        foreach (var mode in Enum.GetValues<DriverMode>())
        {
            foreach (var derived in new[] { false, true })
            {
                var control = CompilationWorkload.CreateNegative($"Negative-{derived}-{mode}", mode, derived);
                control.WriteInputProof();
                var diagnostics = control.Validate(await control.AnalyzeAsync(timeout.Token));
                observations.Add(new { control.Label, diagnostics, control.Components, control.BoundStateCalls });
            }
            var generated = CompilationWorkload.Create(ComponentWorkload.SmallPopulated, mode, generated: true);
            generated.WriteInputProof();
            observations.Add(new
            {
                generated.Label,
                diagnostics = generated.Validate(await generated.AnalyzeAsync(timeout.Token)),
                generated.Components,
                generated.FactoryInvocations,
                generated.HandlerTargets,
                generated.BoundStateCalls
            });
        }
        var sharedAnalyzer = new StateHasChangedAnalyzer();
        var firstLifetime = CompilationWorkload.Create(ComponentWorkload.WidePartials, DriverMode.Concurrent, analyzer: sharedAnalyzer);
        var secondLifetime = CompilationWorkload.Create(ComponentWorkload.WidePartials, DriverMode.Concurrent, padding: 3, analyzer: sharedAnalyzer);
        firstLifetime.WriteInputProof();
        secondLifetime.WriteInputProof();
        var firstTask = firstLifetime.AnalyzeAsync(timeout.Token);
        var secondTask = secondLifetime.AnalyzeAsync(timeout.Token);
        await Task.WhenAll(firstTask, secondTask);
        observations.Add(new
        {
            label = "Same-analyzer-two-real-compilation-lifetimes",
            concurrentlyStartedDriverRuns = 2,
            sameAnalyzerInstance = true,
            first = firstLifetime.Validate(await firstTask),
            second = secondLifetime.Validate(await secondTask),
            inputSourcePaddingDifference = 3
        });
        var report = new
        {
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId,
            observations,
            resources,
            producers,
            actualDriverDiagnosticsConsumed = true,
            inputsUseActualComponentsMetadata = true,
            browserRenderingOrFullBuildClaimed = false
        };
        Evidence.Write("actual-analyzer-contract-resources", report);
        Console.WriteLine($"AUTOPERF_F103_PROBE {Evidence.Compact(new
        {
            observations = observations.Count,
            resources = resources.Count,
            producerCases = producers.Count,
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256
        })}");
    }
}
