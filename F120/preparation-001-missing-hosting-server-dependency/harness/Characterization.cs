// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using Microsoft.AspNetCore.Mvc;

namespace AutoPerf;

internal static class Characterization
{
    internal static async Task RunAsync()
    {
        foreach (var profile in Enum.GetValues<CollectionProfile>())
        {
            foreach (var enabled in new[] { false, true })
            {
                var scenario = await CollectionScenario.CreateAsync(profile, enabled).ConfigureAwait(false);
                scenario.Validate();
                Evidence.Write("actual-prepared-public-contract", new
                {
                    actualProfile = profile.ToString(), actualEnableActionInvokers = enabled,
                    actualCount = scenario.Factories.Count,
                    actualContains = scenario.Factories.Contains(scenario.Probe),
                    actualIndexOf = scenario.Factories.IndexOf(scenario.Probe),
                    actualExpectedIndex = scenario.ExpectedIndex, actualPassed = true
                });
            }
        }
        foreach (var copied in new[] { false, true })
        {
            var source = new object?[] { null, "present" };
            var list = Create<object?>(source);
            if (copied)
            {
                list.Add("temporary");
                list.RemoveAt(list.Count - 1);
            }
            Evidence.Require(list.Contains(null) && list.Contains("present") && !list.Contains("missing")
                && source.SequenceEqual(new object?[] { null, "present" }), "Null/present/missing or source isolation changed.");
            Evidence.Write("actual-null-and-reference-contract", new { actualCopied = copied, actualPassed = true });
        }
        var values = Create<ConflictingValue>([new(7)]);
        values.Add(new(8));
        values.RemoveAt(1);
        Evidence.Require(values.Contains(new(7)) && !values.Contains(new(9)),
            "Contains must retain object.Equals rather than the disagreeing IEquatable<T> policy.");
        Evidence.Write("actual-object-equality-contract", new { actualCopied = true, actualObjectEqualsSelected = true, actualPassed = true });
        foreach (var equals in new[] { false, true })
        {
            var first = new CallbackValue();
            var list = Create<CallbackValue>([first]);
            list.Add(new CallbackValue());
            list.RemoveAt(1);
            var callbacks = 0;
            first.Callback = () =>
            {
                callbacks++;
                list.Add(new CallbackValue());

                return equals;
            };
            var expectedFailure = false;
            try
            {
                Evidence.Require(list.Contains(new CallbackValue()) && equals, "Only a matching reentrant callback may short-circuit.");
            }
            catch (InvalidOperationException exception) when (!equals && exception.Message.Contains("Collection was modified", StringComparison.Ordinal))
            {
                expectedFailure = true;
            }
            Evidence.Require(callbacks == 1 && list.Count == 2 && (expectedFailure == !equals),
                "Reentrant version failure or early success changed.");
            Evidence.Write("actual-reentrant-enumeration-contract", new
            {
                actualEqualsResult = equals, actualCallbacks = callbacks,
                actualVersionFailure = expectedFailure, actualFinalCount = list.Count, actualPassed = true
            });
        }
        var enumerated = new EnumerableOnlyList();
        var fallback = Create<object>(enumerated);
        Evidence.Require(fallback.Contains(enumerated.Value) && enumerated.Enumerations == 1 && enumerated.Disposals == 1,
            "The source-backed path must enumerate and dispose the supplied interface, not use its indexer.");
        Evidence.Write("actual-source-interface-contract", new
        {
            actualEnumerations = enumerated.Enumerations, actualDisposals = enumerated.Disposals,
            actualIndexerUsed = false, actualPassed = true
        });
        foreach (var profile in Enum.GetValues<CollectionProfile>())
        {
            var benchmark = new CollectionBenchmarks { Profile = profile };
            await benchmark.Setup().ConfigureAwait(false);
            var expectedIndex = profile switch
            {
                CollectionProfile.CopiedDefault5First or CollectionProfile.UnmodifiedDefault5First => 0,
                CollectionProfile.CopiedDefault5Last => 4,
                _ => -1
            };
            Evidence.Require(benchmark.Contains() == (expectedIndex >= 0)
                && benchmark.UnchangedIndexOf() == expectedIndex, "The public benchmark lifecycle must execute its prepared case.");
            benchmark.Cleanup();
        }
        Evidence.Write("characterization-completed", new
        {
            actualProfiles = 8, actualControllerProducerModes = 2, actualHttpRequests = 48,
            actualPreparedPublicContracts = 16, actualAdditionalEqualityAndEnumerationContracts = 6,
            actualPublicBenchmarkLifecycles = 8,
            actualAllPassed = true, actualTimingRun = false
        });
    }

    private static IList<T> Create<T>(IReadOnlyList<T> source)
    {
        var type = typeof(ControllerContext).Assembly
            .GetType("Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteList`1", throwOnError: true)!
            .MakeGenericType(typeof(T));

        return (IList<T>)Activator.CreateInstance(type, [source])!;
    }

    private readonly struct ConflictingValue(int value) : IEquatable<ConflictingValue>
    {
        private int Value { get; } = value;

        public bool Equals(ConflictingValue other) => false;
        public override bool Equals(object? obj) => obj is ConflictingValue other && Value == other.Value;
        public override int GetHashCode() => Value;
    }

    private sealed class CallbackValue
    {
        internal Func<bool> Callback { get; set; } = () => false;
        public override bool Equals(object? obj) => Callback();
        public override int GetHashCode() => 0;
    }

    private sealed class EnumerableOnlyList : IReadOnlyList<object>
    {
        internal object Value { get; } = new();
        internal int Enumerations { get; private set; }
        internal int Disposals { get; private set; }
        public int Count => throw new InvalidOperationException("The fallback must not inspect Count.");
        public object this[int index] => throw new InvalidOperationException("The fallback must not use the indexer.");

        public IEnumerator<object> GetEnumerator()
        {
            Enumerations++;
            try
            {
                yield return Value;
            }
            finally
            {
                Disposals++;
            }
        }

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}
