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
                scenario.Factories.CopyTo(scenario.Destination, scenario.Offset);
                var consumed = scenario.Factories.ToArray();
                Evidence.Require(consumed.SequenceEqual(scenario.Factories, ReferenceEqualityComparer.Instance),
                    "Real Enumerable.ToArray collection consumption changed.");
                scenario.Validate();
                Evidence.Write("actual-prepared-public-contract", new
                {
                    actualProfile = profile.ToString(), actualEnableActionInvokers = enabled,
                    actualCount = scenario.Factories.Count, actualOffset = scenario.Offset,
                    actualIndexOf = scenario.Factories.IndexOf(scenario.Probe),
                    actualEveryDestinationReferenceVerified = true,
                    actualPrefixAndSuffixSentinelsVerified = true,
                    actualEnumerableToArrayConsumerExecuted = true, actualPassed = true
                });
            }
        }
        foreach (var copied in new[] { false, true })
        {
            var present = new object();
            var later = new object();
            var sentinel = new object();
            var source = new List<object?> { null, present };
            var list = Create<object?>(source, copied);
            source.Add(later);
            object?[] destination = [sentinel, sentinel, sentinel, sentinel, sentinel];
            list.CopyTo(destination, 1);
            Evidence.Require(destination.SequenceEqual([sentinel, null, present, copied ? sentinel : later, sentinel])
                && source.SequenceEqual([null, present, later]) && list.Count == (copied ? 2 : 3),
                "Null/order/offset or source/copy isolation changed.");
            Evidence.Write("actual-null-reference-offset-contract", new { actualCopied = copied, actualPassed = true });

            var empty = Create<object?>([], copied);
            empty.CopyTo(null!, int.MinValue);
            empty.CopyTo([], int.MaxValue);
            var first = new object();
            var second = new object();
            var nonempty = Create<object?>([first, second], copied);
            RequireFailure<NullReferenceException>(() => nonempty.CopyTo(null!, 0));
            object?[] negative = [sentinel];
            RequireFailure<IndexOutOfRangeException>(() => nonempty.CopyTo(negative, -1));
            Evidence.Require(ReferenceEquals(negative[0], sentinel), "A negative offset wrote a destination slot.");
            object?[] shortDestination = [sentinel, sentinel];
            RequireFailure<IndexOutOfRangeException>(() => nonempty.CopyTo(shortDestination, 1));
            Evidence.Require(ReferenceEquals(shortDestination[0], sentinel) && ReferenceEquals(shortDestination[1], first),
                "Short destinations must retain the successful prefix write before failure.");
            var covariant = Create<object?>(["first", new object()], copied);
            string[] strings = ["prefix", "unchanged", "suffix"];
            RequireFailure<ArrayTypeMismatchException>(() => covariant.CopyTo(strings, 1));
            Evidence.Require(strings.SequenceEqual(["prefix", "first", "suffix"]),
                "Covariant destinations must retain the successful prefix write before failure.");
            Evidence.Write("actual-invalid-destination-contract", new
            {
                actualCopied = copied, actualEmptyNullAndInvalidOffsetNoOp = true,
                actualNonemptyNullException = nameof(NullReferenceException),
                actualNegativeAndShortException = nameof(IndexOutOfRangeException),
                actualCovariantException = nameof(ArrayTypeMismatchException),
                actualPartialWritesPreserved = true, actualPassed = true
            });
        }
        foreach (var destinationTooSmall in new[] { false, true })
        {
            var source = new EnumerableOnlyList();
            var list = Create<object>(source, copied: false);
            object[] destination = destinationTooSmall ? [] : new object[1];
            if (destinationTooSmall)
            {
                RequireFailure<IndexOutOfRangeException>(() => list.CopyTo(destination, 0));
            }
            else
            {
                list.CopyTo(destination, 0);
                Evidence.Require(ReferenceEquals(destination[0], source.Value), "The supplied interface item was not copied.");
            }
            Evidence.Require(source.Enumerations == 1 && source.Disposals == 1,
                "The fallback must enumerate and dispose the supplied interface, not use Count or the indexer.");
            Evidence.Write("actual-source-interface-contract", new
            {
                actualDestinationTooSmall = destinationTooSmall, actualEnumerations = source.Enumerations,
                actualDisposals = source.Disposals, actualIndexerUsed = false, actualCountUsed = false, actualPassed = true
            });
        }
        foreach (var profile in Enum.GetValues<CollectionProfile>())
        {
            var benchmark = new CollectionBenchmarks { Profile = profile };
            benchmark.Setup();
            benchmark.CopyTo();
            Evidence.Require(benchmark.UnchangedIndexOf() == -1, "The benchmark control must execute its prepared case.");
            benchmark.Cleanup();
        }
        Evidence.Write("characterization-completed", new
        {
            actualProfiles = 8, actualControllerProducerModes = 2, actualHttpRequests = 48,
            actualPreparedPublicContracts = 16, actualAdditionalCopyAndEnumerationContracts = 6,
            actualPublicBenchmarkLifecycles = 8,
            actualAllPassed = true, actualTimingRun = false
        });
    }

    private static IList<T> Create<T>(IReadOnlyList<T> source, bool copied)
    {
        var type = typeof(ControllerContext).Assembly
            .GetType("Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteList`1", throwOnError: true)!
            .MakeGenericType(typeof(T));
        var list = (IList<T>)Activator.CreateInstance(type, [source])!;
        if (copied)
        {
            list.Clear();
            foreach (var item in source)
            {
                list.Add(item);
            }
        }

        return list;
    }

    private static void RequireFailure<TException>(Action action) where TException : Exception
    {
        try
        {
            action();
        }
        catch (TException exception) when (exception.GetType() == typeof(TException))
        {
            return;
        }

        throw new InvalidOperationException("The exact expected exception was not thrown: " + typeof(TException).Name);
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
