// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AutoPerf;

internal static class Characterization
{
    private static Type Owner => typeof(ControllerContext).Assembly
        .GetType("Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteList`1", throwOnError: true)!;

    internal static void VerifyPublicIndexOfDispatch()
    {
        Evidence.Require(Owner.IsNotPublic && Owner.IsSealed, "Require the actual internal sealed owner.");
        foreach (var context in new[] { typeof(ControllerContext), typeof(PageContext) })
        {
            var property = context.GetProperty(nameof(ControllerContext.ValueProviderFactories))!;
            Evidence.Require(property.PropertyType == typeof(IList<IValueProviderFactory>),
                "The actual public context collection must expose IList.IndexOf.");
            Evidence.Write("actual-public-property-contract", new
            {
                actualContext = context.FullName, actualProperty = property.Name,
                actualPropertyType = property.PropertyType.ToString(), actualIListIndexOfAvailable = true
            });
        }
        var closed = Owner.MakeGenericType(typeof(IValueProviderFactory));
        var map = closed.GetInterfaceMap(typeof(IList<IValueProviderFactory>));
        var position = Array.FindIndex(map.InterfaceMethods, method => method.Name == nameof(IList<IValueProviderFactory>.IndexOf));
        var target = closed.GetMethod(nameof(IList<IValueProviderFactory>.IndexOf), [typeof(IValueProviderFactory)]);
        Evidence.Require(position >= 0 && target is not null && map.TargetMethods[position] == target,
            "The public IList.IndexOf must resolve to this actual loaded owner's IndexOf.");
        Evidence.Write("actual-indexof-interface-map", new
        {
            actualInterface = typeof(IList<IValueProviderFactory>).ToString(),
            actualMethod = map.InterfaceMethods[position].Name,
            actualTarget = map.TargetMethods[position].ToString(),
            actualTargetDeclaringType = map.TargetMethods[position].DeclaringType!.ToString(),
            actualTargetMetadataToken = map.TargetMethods[position].MetadataToken,
            actualTargetMatchesOwnerPublicIndexOf = true,
            actualOptionalApplicationConsumer = true, actualNormalFrameworkCallFrequencyClaimed = false
        });
    }

    internal static async Task RunAsync()
    {
        foreach (var profile in Enum.GetValues<CollectionProfile>())
        {
            foreach (var enableActionInvokers in new[] { false, true })
            {
                var scenario = await CollectionScenario.CreateAsync(profile, enableActionInvokers).ConfigureAwait(false);
                var index = scenario.Factories.IndexOf(scenario.Probe);
                var contains = scenario.Factories.Contains(scenario.Probe);
                Evidence.Require(index == scenario.ExpectedIndex && contains == (scenario.ExpectedIndex >= 0),
                    "The actual post-request public consumer contract changed.");
                scenario.Validate();
                Evidence.Write("actual-public-indexof-contract", new
                {
                    actualProfile = profile.ToString(), actualEnableActionInvokers = enableActionInvokers,
                    actualIndex = index, actualExpectedIndex = scenario.ExpectedIndex,
                    actualContains = contains, actualCount = scenario.Factories.Count,
                    actualPublicIListIndexOfInvoked = true
                });
            }
            var prepared = CollectionScenario.GetPreparedBenchmark(profile);
            var benchmark = new CollectionBenchmarks { Profile = profile };
            benchmark.Setup();
            var observedIndex = benchmark.IndexOf();
            var observedContains = benchmark.UnchangedContains();
            Evidence.Require(observedIndex == prepared.ExpectedIndex
                && observedContains == (prepared.ExpectedIndex >= 0), "The two actual benchmark methods must consume the sealed probe.");
            benchmark.Cleanup();
            Evidence.Write("actual-benchmark-method-contract", new
            {
                actualProfile = profile.ToString(), actualIndex = observedIndex,
                actualContains = observedContains, actualMethodsInvoked = 2,
                actualTimingPerformed = false
            });
        }
        foreach (var copied in new[] { false, true })
        {
            CheckReferenceNullAndIsolation(copied);
            CheckLegacyObjectEquality(copied);
            CheckEqualityOrder(copied);
        }
        foreach (var match in new[] { false, true })
        {
            CheckCopiedMutation(match);
            CheckSourceDisposal(match);
        }
        foreach (var equalityFailure in new[] { false, true })
        {
            CheckFailureDisposal(equalityFailure);
        }
        Evidence.Write("characterization-completed", new
        {
            actualProfiles = 12, actualControllerModes = 2, actualPublicProducerContracts = 24,
            actualBenchmarkMethodChecks = 24, actualLegacySemanticContracts = 12,
            actualApplicationIndexOfResultObservedInHttpResponse = true,
            actualRequestThroughputOrTypicalCallFrequencyClaimed = false,
            actualCompiledPageOrBrowserRequestClaimed = false
        });
    }

    private static IList<T> Create<T>(IReadOnlyList<T> source)
    {
        var closed = Owner.MakeGenericType(typeof(T));
        var constructor = closed.GetConstructor([typeof(IReadOnlyList<T>)])!;
        var collection = (IList<T>)constructor.Invoke([source]);
        var actualSource = closed.GetField("_source", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(collection);
        Evidence.Require(collection.GetType() == closed && ReferenceEquals(actualSource, source),
            "Semantic checks must use the actual owner and supplied source without substitution.");

        return collection;
    }

    private static IList<T> Create<T>(T[] source, bool copied)
    {
        var collection = Create<T>(source);
        if (copied)
        {
            if (source.Length == 0)
            {
                collection.Clear();
            }
            else
            {
                collection[0] = source[0];
            }
        }

        return collection;
    }

    private static void CheckReferenceNullAndIsolation(bool copied)
    {
        var first = new object();
        var last = new object();
        var replacement = new object();
        object?[] source = [first, null, last, first];
        var collection = Create(source, copied);
        Evidence.Require(collection.IndexOf(first) == 0 && collection.IndexOf(null) == 1
            && collection.IndexOf(last) == 2 && collection.IndexOf(new object()) == -1
            && Create(Array.Empty<object?>(), copied).IndexOf(null) == -1, "First/missing/null/duplicate/empty indices changed.");
        source[0] = replacement;
        var remaining = collection.IndexOf(first);
        var replaced = collection.IndexOf(replacement);
        Evidence.Require(remaining == (copied ? 0 : 3) && replaced == (copied ? -1 : 0)
            && collection.IndexOf(null) == 1 && collection.Count == 4
            && ReferenceEquals(source[0], replacement) && source[1] is null
            && ReferenceEquals(source[2], last) && ReferenceEquals(source[3], first), "Source/copy isolation changed.");
        Evidence.Write("actual-indexof-reference-null-isolation-contract", new
        {
            actualCopied = copied, actualFirstRemainingIndex = remaining,
            actualReplacementIndex = replaced, actualEmptyMissingIndex = -1,
            actualAllReferenceNullDuplicateChecksPassed = true
        });
    }

    private static void CheckLegacyObjectEquality(bool copied)
    {
        var references = Create<ObjectEquality>([new(0), new(1)], copied);
        var values = Create<ValueEquality>([new(0), new(1)], copied);
        Evidence.Require(references.IndexOf(new ObjectEquality(1)) == 1
            && references.IndexOf(new ObjectEquality(2)) == -1
            && values.IndexOf(new ValueEquality(1)) == 1 && values.IndexOf(new ValueEquality(2)) == -1,
            "The legacy object.Equals contract must not become IEquatable<T> equality.");
        Evidence.Write("actual-indexof-object-equality-contract", new
        {
            actualCopied = copied, actualReferenceAndValueTypeObjectEqualityVerified = true,
            actualTypedEqualityWouldThrowDistinctProbeException = true
        });
    }

    private static void CheckEqualityOrder(bool copied)
    {
        var probe = new ObservedEquality();
        var calls = new List<int>();
        var first = new ObservedEquality
        {
            OnEquals = value =>
            {
                Evidence.Require(ReferenceEquals(value, probe), "The equality argument was reversed.");
                calls.Add(1);

                return false;
            }
        };
        var matching = new ObservedEquality
        {
            OnEquals = value =>
            {
                Evidence.Require(ReferenceEquals(value, probe), "The equality argument was reversed.");
                calls.Add(2);

                return true;
            }
        };
        var collection = Create([first, matching, new ObservedEquality()], copied);
        var result = collection.IndexOf(probe);
        Evidence.Require(result == 1 && calls.SequenceEqual([1, 2]), "Stored-left equality order or early return changed.");
        Evidence.Write("actual-indexof-equality-order-contract", new
        {
            actualCopied = copied, actualIndex = result, actualEqualityOrder = calls.ToArray(),
            actualLaterElementAndProbeReceiversNotEvaluated = true
        });
    }

    private static void CheckCopiedMutation(bool match)
    {
        var first = new ObservedEquality();
        var later = new ObservedEquality();
        ObservedEquality[] source = [first, later];
        var collection = Create(source, copied: true);
        var comparisons = 0;
        first.OnEquals = _ =>
        {
            comparisons++;
            collection.Add(later);

            return match;
        };
        var threw = false;
        var result = int.MinValue;
        try
        {
            result = collection.IndexOf(new ObservedEquality());
        }
        catch (InvalidOperationException)
        {
            threw = true;
        }
        Evidence.Require(threw == !match && (!match || result == 0)
            && comparisons == 1 && collection.Count == 3 && source.Length == 2
            && ReferenceEquals(source[0], first) && ReferenceEquals(source[1], later),
            "The real equality mutation must throw on the next MoveNext, but not after a matching early return.");
        Evidence.Write("actual-indexof-mutation-contract", new
        {
            actualMatch = match, actualEqualityCalls = comparisons, actualMutationCount = collection.Count,
            actualInvalidOperationException = threw, actualIndex = match ? result : (int?)null,
            actualSourceUnchanged = true
        });
    }

    private static void CheckSourceDisposal(bool match)
    {
        var source = new StrictSource<string>(["first", "second"]);
        var collection = Create<string>(source);
        var result = collection.IndexOf(match ? "second" : "missing");
        Evidence.Require(result == (match ? 1 : -1), "Arbitrary-source match/miss changed.");
        VerifySourceCalls(source, match ? 2 : 3, 2);
        Evidence.Write("actual-indexof-source-disposal-contract", new
        {
            actualMatch = match, actualIndex = result, actualGetEnumeratorCalls = source.Enumerators,
            actualMoveNextCalls = source.MoveNextCalls, actualCurrentCalls = source.CurrentReads,
            actualDisposeCalls = source.Disposes, actualCountAndIndexerReads = 0
        });
    }

    private static void CheckFailureDisposal(bool equalityFailure)
    {
        var failure = new ProbeException();
        var equalityCalls = 0;
        var source = new StrictSource<object>([new ObservedEquality
        {
            OnEquals = _ =>
            {
                equalityCalls++;
                throw failure;
            }
        }]);
        if (!equalityFailure)
        {
            source.ReadCurrent = _ => throw failure;
        }
        var collection = Create<object>(source);
        var caught = false;
        try
        {
            collection.IndexOf(new ObservedEquality());
        }
        catch (ProbeException actual)
        {
            Evidence.Require(ReferenceEquals(actual, failure), "An unrelated helper failure must not satisfy this exception contract.");
            caught = true;
        }
        Evidence.Require(caught && equalityCalls == (equalityFailure ? 1 : 0), "The configured actual producer failure did not run.");
        VerifySourceCalls(source, 1, 1);
        Evidence.Write("actual-indexof-failure-disposal-contract", new
        {
            actualEqualityFailure = equalityFailure, actualEqualityCalls = equalityCalls,
            actualSameFailurePropagated = caught, actualMoveNextCalls = source.MoveNextCalls,
            actualCurrentCalls = source.CurrentReads, actualDisposeCalls = source.Disposes,
            actualCountAndIndexerReads = 0
        });
    }

    private static void VerifySourceCalls<T>(StrictSource<T> source, int moveNext, int current)
    {
        Evidence.Require(source.Enumerators == 1 && source.MoveNextCalls == moveNext
            && source.CurrentReads == current && source.Disposes == 1
            && source.CountReads == 0 && source.IndexerReads == 0,
            "The actual source enumerator interactions or disposal changed.");
    }

    private sealed class ObjectEquality(int value) : IEquatable<ObjectEquality>
    {
        private readonly int _value = value;
        public bool Equals(ObjectEquality? other) => throw new ProbeException();
        public override bool Equals(object? obj) => obj is ObjectEquality other && _value == other._value;
        public override int GetHashCode() => _value;
    }

    private readonly struct ValueEquality(int value) : IEquatable<ValueEquality>
    {
        private readonly int _value = value;
        public bool Equals(ValueEquality other) => throw new ProbeException();
        public override bool Equals(object? obj) => obj is ValueEquality other && _value == other._value;
        public override int GetHashCode() => _value;
    }

    private sealed class ObservedEquality
    {
        internal Func<object?, bool> OnEquals { get; set; } = _ => throw new ProbeException();
        public override bool Equals(object? obj) => OnEquals(obj);
        public override int GetHashCode() => 0;
    }

    private sealed class ProbeException : Exception
    {
    }

    private sealed class StrictSource<T>(T[] items) : IReadOnlyList<T>
    {
        internal int Enumerators { get; private set; }
        internal int MoveNextCalls { get; private set; }
        internal int CurrentReads { get; private set; }
        internal int Disposes { get; private set; }
        internal int CountReads { get; private set; }
        internal int IndexerReads { get; private set; }
        internal Func<T, T> ReadCurrent { get; set; } = static value => value;
        public int Count
        {
            get
            {
                CountReads++;
                throw new ProbeException();
            }
        }
        public T this[int index]
        {
            get
            {
                IndexerReads++;
                throw new ProbeException();
            }
        }
        public IEnumerator<T> GetEnumerator()
        {
            Enumerators++;

            return new Cursor(this, items);
        }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

        private sealed class Cursor(StrictSource<T> source, T[] values) : IEnumerator<T>
        {
            private int _index = -1;
            public T Current
            {
                get
                {
                    source.CurrentReads++;

                    return source.ReadCurrent(values[_index]);
                }
            }
            object? IEnumerator.Current => Current;
            public bool MoveNext()
            {
                source.MoveNextCalls++;
                _index++;

                return _index < values.Length;
            }
            public void Reset() => throw new NotSupportedException();
            public void Dispose()
            {
                source.Disposes++;
            }
        }
    }
}
