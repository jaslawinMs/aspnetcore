// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Globalization;

namespace AutoPerf;

internal static class Characterization
{
    public static void Run()
    {
        var records = new List<object>();
        foreach (var count in RenderScenario.Counts)
        {
            foreach (var keys in RenderScenario.KeyKinds)
            {
                foreach (var workload in RenderScenario.Workloads)
                {
                    using var scenario = new RenderScenario(count, keys, workload, capture: true);
                    var initial = scenario.Snapshot();
                    Evidence.Complete(scenario.RenderNextAsync());
                    scenario.Validate();
                    var first = scenario.Snapshot();
                    Evidence.Complete(scenario.RenderNextAsync());
                    scenario.Validate();
                    var second = scenario.Snapshot();
                    Evidence.Require(scenario.Batches == 3, "Every characterized producer must deliver all three batches.");
                    if (workload is WorkloadKind.KeyedStable or WorkloadKind.UnkeyedStable)
                    {
                        Evidence.Require(scenario.History.Skip(1).All(batch =>
                            batch.UpdatedComponents.All(diff => diff.Edits.Length == 0)),
                            "An unchanged full render must produce no edits.");
                    }
                    records.Add(new { name = scenario.Profile, initial, first, second, batches = scenario.History });
                }
            }
        }

        using (var scenario = new RenderScenario([], [], capture: true, "ActualPoolReuseAndGrowth"))
        {
            var snapshots = new List<object>();
            foreach (var count in new[] { 1, 16, 513, 1, 0, 16 })
            {
                scenario.RenderItems(RenderScenario.CreateItems(count, 0, KeyKind.Integer, WorkloadKind.KeyedStable));
                scenario.Validate();
                snapshots.Add(new { count, actualFrames = scenario.Snapshot() });
            }
            records.Add(new { name = scenario.Profile, snapshots, batches = scenario.History });
        }

        foreach (var collide in new[] { false, true })
        {
            var counter = new ProbeCounter();
            var count = collide ? 16 : 32;
            Item[] Items(bool reversed) => Enumerable.Range(0, count)
                .Select(id => new Item(id, id.ToString(CultureInfo.InvariantCulture), "Row " + id,
                    new ProbeKey(id, collide, counter)))
                .OrderBy(item => reversed ? -item.Id : item.Id).ToArray();
            using var scenario = new RenderScenario(Items(false), Items(true), capture: true,
                collide ? "ActualCollisionsAndValueEquality" : "ActualValueEqualityAndProbeWitness");
            Evidence.Complete(scenario.RenderNextAsync());
            scenario.Validate();
            var reversed = scenario.Snapshot();
            Evidence.Complete(scenario.RenderNextAsync());
            scenario.Validate();
            counter.HashCalls = 0;
            scenario.RenderItems(Items(false));
            scenario.Validate();
            var hashCalls = counter.HashCalls;
            Evidence.Require(hashCalls > 0, "The real keyed owner must actually invoke the instrumented producer keys.");
            records.Add(new { name = scenario.Profile, reversed, final = scenario.Snapshot(), batches = scenario.History });
            Evidence.Write("untimed-probe-witness", new { profile = scenario.Profile, count, actualHashCalls = hashCalls,
                actualRealRendererProduced = true, actualTimed = false });
        }

        using (var scenario = new RenderScenario(
            RenderScenario.CreateItems(3, 1, KeyKind.Integer, WorkloadKind.KeyedStable),
            [], capture: true, "ActualFailedNewTreeThenOldDuplicateProducer"))
        {
            var first = RenderScenario.CreateItems(3, 1, KeyKind.Integer, WorkloadKind.KeyedStable);
            var duplicate = new[] { first[0], first[1], first[0] };
            static object Observe(Action action, string producer)
            {
                try
                {
                    action();
                }
                catch (InvalidOperationException exception)
                {
                    Evidence.Require(exception.Message ==
                        "More than one sibling of element 'li' has the same key value, '1'. Key values must be unique.",
                        "Exact actual duplicate-key exception changed.");

                    return new { producer, exception = exception.GetType().FullName, exception.Message };
                }

                throw new InvalidOperationException("Actual duplicate-key producer did not throw.");
            }
            var newFailure = Observe(() => scenario.RenderItems(duplicate), "real duplicate new render");
            var actualFailedTree = scenario.Snapshot();
            var oldFailure = Observe(() => scenario.RenderItems(first),
                "real prior failed render becomes old tree; replacement new keys are unique");
            records.Add(new { name = scenario.Profile, newFailure, actualFailedTree, oldFailure, batches = scenario.History });
        }

        Evidence.Require(records.Count == 44, "Require all forty profile semantics and four additional real-producer records.");
        Evidence.Write("semantic-records", records);
        var lifecycles = new List<object>();
        foreach (var count in RenderScenario.Counts)
        {
            foreach (var keys in RenderScenario.KeyKinds)
            {
                foreach (var workload in RenderScenario.Workloads)
                {
                    var benchmark = new KeyedRenderBenchmarks { Count = count, Keys = keys, Workload = workload };
                    benchmark.Setup();
                    Evidence.Complete(benchmark.Render());
                    Evidence.Complete(benchmark.Render());
                    benchmark.Cleanup();
                    lifecycles.Add(new { count, keys = keys.ToString(), workload = workload.ToString(), actualPassed = true });
                }
            }
        }
        Evidence.Require(lifecycles.Count == 40, "Every actual benchmark setup/body/cleanup lifecycle must run.");
        Evidence.Write("benchmark-lifecycles", lifecycles);
        Console.WriteLine("F038:44 actual producer semantic records and40 actual benchmark lifecycles passed;no timing.");
    }
}
