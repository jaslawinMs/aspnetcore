using System.Diagnostics;
using BenchmarkDotNet.Engines;

namespace AutoPerf;

internal static class Probe
{
    internal static void Run()
    {
        var contracts = new List<object>();
        var resources = new List<object>();
        foreach (var label in TokenFixture.Labels)
        {
            using var workload = new Workload(TokenFixture.Load(Evidence.FixtureDirectory, label), Evidence.FixtureDirectory);
            var input = Evidence.WriteInput(label);
            var contract = workload.Capture();
            contracts.Add(new { input, contract });
            for (var warmup = 0; warmup < 2048; warmup++)
            {
                Evidence.Require(workload.Run().GetAwaiter().GetResult() == workload.Input.ExpectedResult,
                    "Actual warmed token-verification outcome differs.");
            }
            for (var sample = 0; sample < 5; sample++)
            {
                const int operations = 8192;
                var enclosingInitial = GcStats.ReadInitial();
                var before = GC.GetTotalAllocatedBytes(precise: true);
                var started = Stopwatch.GetTimestamp();
                var trueCount = 0;
                for (var index = 0; index < operations; index++)
                {
                    if (workload.Run().GetAwaiter().GetResult())
                    {
                        trueCount++;
                    }
                }
                var elapsed = Stopwatch.GetElapsedTime(started);
                var after = GC.GetTotalAllocatedBytes(precise: true);
                var enclosing = (GcStats.ReadFinal() - enclosingInitial).WithTotalOperations(operations);
                var enclosingBytes = enclosing.GetTotalAllocatedBytes(excludeAllocationQuantumSideEffects: false);
                Evidence.Require(trueCount == (workload.Input.ExpectedResult ? operations : 0) && enclosingBytes >= after - before,
                    "Complete caliper outcomes/enclosing process-wide allocation differ.");
                resources.Add(new
                {
                    label, sample, operations, trueCount, expectedResult = workload.Input.ExpectedResult,
                    allocatedBefore = before, allocatedAfter = after, allocatedBytes = after - before,
                    bytesPerOperation = (after - before) / (double)operations,
                    enclosingActualBdnGcHelperBytes = enclosingBytes,
                    enclosingActualBdnGcHelperExtraBytes = enclosingBytes - (after - before),
                    enclosingActualBdnGcHelperBytesPerOperation = enclosing.BytesAllocatedPerOperation,
                    elapsedTimeSpanTicks = elapsed.Ticks, stopwatchFrequency = Stopwatch.Frequency,
                    processWideManagedBoundaryNotNativeOrPureDecoderAllocation = true,
                    syncObservationOfActuallySynchronousInMemoryStoreOutsideBdnAsyncMethod = true
                });
            }
        }
        Evidence.Write("contract-resources", new
        {
            variant = Evidence.Variant, contracts, resources, ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256, processId = Environment.ProcessId,
            allCompleteOutcomesAndExactContractsPassed = true, independentContractRuns = contracts.Count * 2,
            operationsPerResourceSample = 8192, sourceComparisonProfile = false
        });
        Console.WriteLine($"F109 actual {Evidence.Variant}:{contracts.Count} complete public-manager contracts/{resources.Count} warmed resource samples;two real logged/exception-observed completions per contract passed.");
    }
}
