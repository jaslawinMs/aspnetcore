using System.Collections;
using System.Diagnostics;
using BenchmarkDotNet.Engines;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace AutoPerf;

internal static class Probe
{
    internal static void Run()
    {
        var contracts = new List<object>();
        var resources = new List<object>();
        foreach (var label in Workload.Labels)
        {
            using var workload = new Workload(label);
            var input = Evidence.WriteInput(workload);
            var contract = workload.Capture();
            contracts.Add(new { input, contract });
            for (var warmup = 0; warmup < 16384; warmup++)
            {
                Evidence.Require(workload.Run() == workload.ExpectedChecksum, "Actual warmup checksum differs.");
            }
            for (var sample = 0; sample < 5; sample++)
            {
                const int operations = 65536;
                var enclosingInitial = GcStats.ReadInitial();
                var before = GC.GetTotalAllocatedBytes(precise: true);
                var started = Stopwatch.GetTimestamp();
                var checksum = 0L;
                for (var index = 0; index < operations; index++)
                {
                    checksum += workload.Run();
                }
                var elapsed = Stopwatch.GetElapsedTime(started);
                var after = GC.GetTotalAllocatedBytes(precise: true);
                var enclosing = (GcStats.ReadFinal() - enclosingInitial).WithTotalOperations(operations);
                var enclosingBytes = enclosing.GetTotalAllocatedBytes(excludeAllocationQuantumSideEffects: false);
                Evidence.Require(checksum == (long)operations * workload.ExpectedChecksum && enclosingBytes >= after - before,
                    "Complete caliper checksum/enclosing process-wide allocation differs.");
                resources.Add(new
                {
                    label, sample, operations, checksum, expectedChecksum = workload.ExpectedChecksum,
                    allocatedBefore = before, allocatedAfter = after, allocatedBytes = after - before,
                    bytesPerOperation = (after - before) / (double)operations,
                    enclosingActualBdnGcHelperBytes = enclosingBytes,
                    enclosingActualBdnGcHelperExtraBytes = enclosingBytes - (after - before),
                    enclosingActualBdnGcHelperBytesPerOperation = enclosing.BytesAllocatedPerOperation,
                    elapsedTimeSpanTicks = elapsed.Ticks,
                    stopwatchFrequency = Stopwatch.Frequency,
                    processWideManagedBoundaryNotNativeOrPureEnumeratorAllocation = true,
                    warmOriginalCaliperNotOptimizationComparison = true
                });
            }
        }
        Evidence.Write("original-contract-resources", new
        {
            contracts, resources,
            semanticControls = Semantics(),
            ownerSha256 = Evidence.OwnerSha256,
            harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId,
            allOperationsCompletedAndChecksumsVerified = true,
            sourceComparisons = 0
        });
        Console.WriteLine($"F105:actual {contracts.Count} original contracts/{resources.Count} warmed resource samples/public Reset/reference/live-view/mutation controls passed.");
    }

    private static object Semantics()
    {
        var method = typeof(ValidationStateDictionary).GetMethod(nameof(ValidationStateDictionary.GetEnumerator), Type.EmptyTypes)
            ?? throw new InvalidOperationException("The shipped public method is missing.");
        Evidence.Require(method.ReturnType == typeof(IEnumerator<KeyValuePair<object, ValidationStateEntry>>),
            "Shipped interface return signature changed.");
        var firstKey = new ProbeKey(1);
        var secondKey = new ProbeKey(2);
        Evidence.Require(firstKey.Equals(secondKey) && !ReferenceEquals(firstKey, secondKey), "Value-equal/distinct input prerequisite not established.");
        ProbeKey.EqualsCalls = 0;
        ProbeKey.HashCalls = 0;
        var firstEntry = new ValidationStateEntry { Key = "first" };
        var secondEntry = new ValidationStateEntry { Key = "second" };
        var state = new ValidationStateDictionary();
        var keys = state.Keys;
        var values = state.Values;
        Evidence.Require(keys.Count == 0 && values.Count == 0, "Empty live-view prerequisite differs.");
        state.Add(firstKey, firstEntry);
        state.Add(secondKey, secondEntry);
        Evidence.Require(state.Count == 2 && keys.Count == 2 && values.Count == 2 &&
            state.TryGetValue(firstKey, out var actualFirst) && ReferenceEquals(actualFirst, firstEntry) &&
            state.TryGetValue(secondKey, out var actualSecond) && ReferenceEquals(actualSecond, secondEntry) &&
            !state.TryGetValue(new ProbeKey(1), out _) && ProbeKey.EqualsCalls == 0 && ProbeKey.HashCalls == 0,
            "Actual reference-identity dictionary/value semantics changed.");
        var observations = new List<object>();
        foreach (var kind in new[] { "Concrete", "Generic", "NonGeneric" })
        {
            var iterator = Get(state, kind);
            var other = Get(state, kind);
            Evidence.Require(iterator.MoveNext() && other.MoveNext() && ReferenceEquals(Pair(iterator).Key, firstKey) &&
                ReferenceEquals(Pair(other).Key, firstKey) && iterator.MoveNext() &&
                ReferenceEquals(Pair(iterator).Key, secondKey) && ReferenceEquals(Pair(other).Key, firstKey),
                "Independent real enumerator progress differs.");
            iterator.Reset();
            Evidence.Require(iterator.MoveNext() && ReferenceEquals(Pair(iterator).Key, firstKey) &&
                other.MoveNext() && ReferenceEquals(Pair(other).Key, secondKey) && !other.MoveNext(),
                "Existing public Reset consumer or independent completion differs.");
            (iterator as IDisposable)?.Dispose();
            (other as IDisposable)?.Dispose();
            observations.Add(new { kind, independentInterleaving = true, publicResetRestarts = true, complete = true,
                enumeratorType = iterator.GetType().FullName });
        }
        var mutations = new List<object>();
        foreach (var kind in new[] { "Concrete", "Generic", "NonGeneric" })
        {
            foreach (var mutation in new[] { "Add", "Remove", "Clear" })
            {
                var current = new ValidationStateDictionary();
                current.Add(firstKey, firstEntry);
                current.Add(secondKey, secondEntry);
                var iterator = Get(current, kind);
                Evidence.Require(iterator.MoveNext() && ReferenceEquals(Pair(iterator).Key, firstKey), "Mutation producer prerequisite differs.");
                if (mutation is "Add")
                {
                    current.Add(new ProbeKey(3), new ValidationStateEntry { Key = "third" });
                    var actual = ExpectInvalidated(iterator);
                    mutations.Add(new { kind, mutation, exception = actual, remaining = -1 });
                }
                else
                {
                    if (mutation is "Remove")
                    {
                        Evidence.Require(current.Remove(secondKey), "Actual dictionary removal failed.");
                    }
                    else
                    {
                        current.Clear();
                    }
                    var remaining = 0;
                    while (iterator.MoveNext())
                    {
                        remaining++;
                    }
                    Evidence.Require(remaining == 0, "Actual remove/clear enumeration continuation differs.");
                    mutations.Add(new { kind, mutation, exception = (string?)null, remaining });
                }
                (iterator as IDisposable)?.Dispose();
            }
        }
        state.Clear();
        Evidence.Require(keys.Count == 0 && values.Count == 0 && ProbeKey.EqualsCalls == 0 && ProbeKey.HashCalls == 0,
            "Actual live views or reference-identity keys changed after owner mutations.");

        return new
        {
            actualShippedReturnType = method.ReturnType.ToString(),
            shippedReturnPreserved = true,
            valueEqualDistinctKeysEstablished = true,
            actualReferenceIdentityLookupsPassed = true,
            actualValueEqualsCalls = ProbeKey.EqualsCalls,
            actualValueHashCalls = ProbeKey.HashCalls,
            liveKeyValueViewsObserveAddAndClear = true,
            enumerators = observations,
            mutations,
            hypotheticalStructReturnBinaryWasNotBuiltOrExecuted = true
        };
    }

    private static IEnumerator Get(ValidationStateDictionary state, string kind) => kind switch
    {
        "Concrete" => state.GetEnumerator(),
        "Generic" => ((IEnumerable<KeyValuePair<object, ValidationStateEntry>>)state).GetEnumerator(),
        "NonGeneric" => ((IEnumerable)state).GetEnumerator(),
        _ => throw new InvalidOperationException("Unknown explicit static consumer.")
    };

    private static KeyValuePair<object, ValidationStateEntry> Pair(IEnumerator iterator) =>
        (KeyValuePair<object, ValidationStateEntry>)iterator.Current;

    private static string ExpectInvalidated(IEnumerator iterator)
    {
        try
        {
            iterator.MoveNext();
        }
        catch (InvalidOperationException exception)
        {
            return exception.GetType().FullName ?? throw new InvalidOperationException("Exception type is unnamed.");
        }

        throw new InvalidOperationException("Actual dictionary Add did not invalidate its existing enumerator.");
    }
}
