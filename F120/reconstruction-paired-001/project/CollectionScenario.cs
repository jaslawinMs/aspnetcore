// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AutoPerf;

public enum CollectionProfile
{
    CopiedDefault5Miss,
    UnmodifiedDefault5Miss,
    CopiedDefault5First,
    CopiedDefault5Last,
    CopiedEmptyMiss,
    CopiedOneMiss,
    CopiedEightMiss,
    UnmodifiedDefault5First
}

internal sealed class CollectionScenario
{
    private static readonly Dictionary<CollectionProfile, CollectionScenario> PreparedBenchmarks = [];
    private readonly IValueProviderFactory[] _snapshot;
    internal IList<IValueProviderFactory> Factories { get; }
    internal IValueProviderFactory Probe { get; }
    internal int ExpectedIndex { get; }
    internal CollectionProfile Profile { get; }

    private CollectionScenario(CollectionProfile profile, IList<IValueProviderFactory> factories)
    {
        Profile = profile;
        Factories = factories;
        _snapshot = factories.ToArray();
        ExpectedIndex = profile switch
        {
            CollectionProfile.CopiedDefault5First or CollectionProfile.UnmodifiedDefault5First => 0,
            CollectionProfile.CopiedDefault5Last => factories.Count - 1,
            _ => -1
        };
        Probe = ExpectedIndex < 0 ? new MarkerFactory("missing") : factories[ExpectedIndex];
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
        profile is not (CollectionProfile.UnmodifiedDefault5Miss or CollectionProfile.UnmodifiedDefault5First);

    internal static int? ConfiguredCount(CollectionProfile profile) => profile switch
    {
        CollectionProfile.CopiedEmptyMiss => 0,
        CollectionProfile.CopiedOneMiss => 1,
        CollectionProfile.CopiedEightMiss => 8,
        _ => null
    };

    internal void Validate()
    {
        Evidence.Require(Factories.Count == (ConfiguredCount(Profile) ?? 5)
            && Factories.SequenceEqual(_snapshot, ReferenceEqualityComparer.Instance),
            "Prepared request collection changed.");
        Evidence.Require(Factories.Contains(Probe) == (ExpectedIndex >= 0)
            && Factories.IndexOf(Probe) == ExpectedIndex, "Prepared public Contains/IndexOf result changed.");
        var store = HostedProducer.ReadStore(Factories);
        Evidence.Require((store.Copy is not null) == RequiresCopy(Profile),
            "The prepared collection did not retain the declared source/private-copy state.");
    }
}
