// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AutoPerf;

public enum CollectionProfile
{
    CopiedDefault5,
    UnmodifiedDefault5,
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
    internal IValueProviderFactory Probe { get; } = new MarkerFactory("missing");
    internal CollectionProfile Profile { get; }
    internal int ExpectedChecksum { get; }

    private CollectionScenario(CollectionProfile profile, IList<IValueProviderFactory> factories)
    {
        Profile = profile;
        Factories = factories;
        _snapshot = factories.ToArray();
        var checksum = 17;
        foreach (var factory in _snapshot)
        {
            checksum = unchecked(checksum * 31 + RuntimeHelpers.GetHashCode(factory));
        }
        ExpectedChecksum = checksum;
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

    internal static bool RequiresCopy(CollectionProfile profile) =>
        profile is CollectionProfile.CopiedDefault5 or CollectionProfile.CopiedEmpty
            or CollectionProfile.CopiedOne or CollectionProfile.CopiedEight;

    internal static int? ConfiguredCount(CollectionProfile profile) => profile switch
    {
        CollectionProfile.CopiedEmpty or CollectionProfile.UnmodifiedEmpty => 0,
        CollectionProfile.CopiedOne or CollectionProfile.UnmodifiedOne => 1,
        CollectionProfile.CopiedEight or CollectionProfile.UnmodifiedEight => 8,
        _ => null
    };

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
        Evidence.Require(Factories.IndexOf(Probe) == -1, "The unchanged missing-item control changed.");
        var store = HostedProducer.ReadStore(Factories);
        Evidence.Require((store.Copy is not null) == RequiresCopy(Profile),
            "The prepared source/private-copy state changed.");
    }
}
