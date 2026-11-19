// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AutoPerf;

public enum CollectionProfile
{
    CopiedDefault5,
    UnmodifiedDefault5,
    CopiedDefault5Offset2,
    UnmodifiedDefault5Offset2,
    CopiedEmpty,
    CopiedOne,
    CopiedEight,
    CopiedEightOffset2
}

internal sealed class CollectionScenario
{
    private static readonly Dictionary<CollectionProfile, CollectionScenario> PreparedBenchmarks = [];
    private readonly IValueProviderFactory[] _snapshot;
    private readonly IValueProviderFactory _sentinel = new MarkerFactory("destination-sentinel");
    internal IList<IValueProviderFactory> Factories { get; }
    internal IValueProviderFactory Probe { get; } = new MarkerFactory("missing");
    internal IValueProviderFactory[] Destination { get; }
    internal CollectionProfile Profile { get; }
    internal int Offset { get; }

    private CollectionScenario(CollectionProfile profile, IList<IValueProviderFactory> factories)
    {
        Profile = profile;
        Factories = factories;
        _snapshot = factories.ToArray();
        Offset = profile is CollectionProfile.CopiedDefault5Offset2
            or CollectionProfile.UnmodifiedDefault5Offset2 or CollectionProfile.CopiedEightOffset2 ? 2 : 0;
        Destination = Enumerable.Repeat(_sentinel, factories.Count + Offset * 2).ToArray();
        factories.CopyTo(Destination, Offset);
        Validate();
    }

    internal static async Task<CollectionScenario> CreateAsync(CollectionProfile profile, bool enableActionInvokers)
    {
        var factories = await HostedProducer.CaptureAsync(profile, enableActionInvokers).ConfigureAwait(false);

        return new CollectionScenario(profile, factories);
    }

    internal static async Task PrepareBenchmarksAsync()
    {
        Evidence.Require(PreparedBenchmarks.Count == 0, "Prepare the actual request collections exactly once per process.");
        foreach (var profile in Enum.GetValues<CollectionProfile>())
        {
            PreparedBenchmarks.Add(profile, await CreateAsync(profile, enableActionInvokers: false).ConfigureAwait(false));
        }
    }

    internal static CollectionScenario GetPreparedBenchmark(CollectionProfile profile) => PreparedBenchmarks[profile];

    internal static bool RequiresCopy(CollectionProfile profile) =>
        profile is not (CollectionProfile.UnmodifiedDefault5 or CollectionProfile.UnmodifiedDefault5Offset2);

    internal static int? ConfiguredCount(CollectionProfile profile) => profile switch
    {
        CollectionProfile.CopiedEmpty => 0,
        CollectionProfile.CopiedOne => 1,
        CollectionProfile.CopiedEight or CollectionProfile.CopiedEightOffset2 => 8,
        _ => null
    };

    internal void Validate()
    {
        Evidence.Require(Factories.Count == (ConfiguredCount(Profile) ?? 5)
            && Factories.SequenceEqual(_snapshot, ReferenceEqualityComparer.Instance),
            "Prepared request collection changed.");
        Evidence.Require(Factories.IndexOf(Probe) == -1, "The unchanged missing-item control changed.");
        Evidence.Require(Destination.Skip(Offset).Take(_snapshot.Length).SequenceEqual(_snapshot, ReferenceEqualityComparer.Instance)
            && Destination.Take(Offset).All(value => ReferenceEquals(value, _sentinel))
            && Destination.Skip(Offset + _snapshot.Length).All(value => ReferenceEquals(value, _sentinel)),
            "CopyTo changed the copied references, order or untouched destination slots.");
        var store = HostedProducer.ReadStore(Factories);
        Evidence.Require((store.Copy is not null) == RequiresCopy(Profile),
            "The prepared collection did not retain the declared source/private-copy state.");
    }
}
