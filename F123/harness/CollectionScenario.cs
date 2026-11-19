// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AutoPerf;

public enum CollectionProfile
{
    CopiedDefault5,
    UnmodifiedDefault5,
    CopiedDefault5HitFirst,
    UnmodifiedDefault5HitFirst,
    CopiedDefault5HitLast,
    UnmodifiedDefault5HitLast,
    CopiedEmpty,
    UnmodifiedEmpty,
    CopiedOne,
    UnmodifiedOne,
    CopiedEight,
    UnmodifiedEight
}

internal sealed class CollectionScenario
{
    private static readonly Dictionary<CollectionProfile, CollectionScenario> PreparedBenchmarks = [];
    private readonly IValueProviderFactory[] _snapshot;
    internal IList<IValueProviderFactory> Factories { get; }
    internal IValueProviderFactory Probe { get; }
    internal CollectionProfile Profile { get; }
    internal int ExpectedIndex { get; }

    private CollectionScenario(CollectionProfile profile, IList<IValueProviderFactory> factories)
    {
        Profile = profile;
        Factories = factories;
        _snapshot = factories.ToArray();
        Probe = SelectProbe(profile, _snapshot);
        ExpectedIndex = GetExpectedIndex(profile);
        Validate();
    }

    internal static async Task<CollectionScenario> CreateAsync(CollectionProfile profile, bool enableActionInvokers)
    {
        var factories = await HostedProducer.CaptureAsync(profile, enableActionInvokers).ConfigureAwait(false);

        return new CollectionScenario(profile, factories);
    }

    internal static async Task PrepareBenchmarksAsync()
    {
        Evidence.Require(PreparedBenchmarks.Count == 0, "Prepare actual request collections exactly once.");
        foreach (var profile in Enum.GetValues<CollectionProfile>())
        {
            PreparedBenchmarks.Add(profile, await CreateAsync(profile, enableActionInvokers: false).ConfigureAwait(false));
        }
    }

    internal static CollectionScenario GetPreparedBenchmark(CollectionProfile profile) => PreparedBenchmarks[profile];

    internal static bool RequiresCopy(CollectionProfile profile) => profile switch
    {
        CollectionProfile.CopiedDefault5 or CollectionProfile.CopiedDefault5HitFirst
            or CollectionProfile.CopiedDefault5HitLast or CollectionProfile.CopiedEmpty
            or CollectionProfile.CopiedOne or CollectionProfile.CopiedEight => true,
        CollectionProfile.UnmodifiedDefault5 or CollectionProfile.UnmodifiedDefault5HitFirst
            or CollectionProfile.UnmodifiedDefault5HitLast or CollectionProfile.UnmodifiedEmpty
            or CollectionProfile.UnmodifiedOne or CollectionProfile.UnmodifiedEight => false,
        _ => throw new ArgumentOutOfRangeException(nameof(profile))
    };

    internal static int? ConfiguredCount(CollectionProfile profile) => profile switch
    {
        CollectionProfile.CopiedEmpty or CollectionProfile.UnmodifiedEmpty => 0,
        CollectionProfile.CopiedOne or CollectionProfile.UnmodifiedOne => 1,
        CollectionProfile.CopiedEight or CollectionProfile.UnmodifiedEight => 8,
        CollectionProfile.CopiedDefault5 or CollectionProfile.UnmodifiedDefault5
            or CollectionProfile.CopiedDefault5HitFirst or CollectionProfile.UnmodifiedDefault5HitFirst
            or CollectionProfile.CopiedDefault5HitLast or CollectionProfile.UnmodifiedDefault5HitLast => null,
        _ => throw new ArgumentOutOfRangeException(nameof(profile))
    };

    internal static int GetExpectedIndex(CollectionProfile profile) => profile switch
    {
        CollectionProfile.CopiedDefault5HitFirst or CollectionProfile.UnmodifiedDefault5HitFirst => 0,
        CollectionProfile.CopiedDefault5HitLast or CollectionProfile.UnmodifiedDefault5HitLast => 4,
        CollectionProfile.CopiedDefault5 or CollectionProfile.UnmodifiedDefault5
            or CollectionProfile.CopiedEmpty or CollectionProfile.UnmodifiedEmpty
            or CollectionProfile.CopiedOne or CollectionProfile.UnmodifiedOne
            or CollectionProfile.CopiedEight or CollectionProfile.UnmodifiedEight => -1,
        _ => throw new ArgumentOutOfRangeException(nameof(profile))
    };

    internal static IValueProviderFactory SelectProbe(CollectionProfile profile, IReadOnlyList<IValueProviderFactory> snapshot)
    {
        var index = GetExpectedIndex(profile);

        return index < 0 ? new MarkerFactory("missing") : snapshot[index];
    }

    internal void Validate()
    {
        Evidence.Require(Factories.Count == (ConfiguredCount(Profile) ?? 5)
            && Factories.SequenceEqual(_snapshot, ReferenceEqualityComparer.Instance),
            "Prepared request collection changed.");
        var observed = new List<object?>();
        foreach (var item in (IEnumerable)Factories)
        {
            observed.Add(item);
        }
        Evidence.Require(observed.SequenceEqual(_snapshot, ReferenceEqualityComparer.Instance),
            "Non-generic enumeration changed a reference or its order.");
        Evidence.Require(Factories.IndexOf(Probe) == ExpectedIndex
            && Factories.Contains(Probe) == (ExpectedIndex >= 0),
            "The prepared public IndexOf/unchanged Contains probe is incorrect.");
        var store = HostedProducer.ReadStore(Factories);
        Evidence.Require((store.Copy is not null) == RequiresCopy(Profile),
            "The prepared source/private-copy state changed.");
    }
}
