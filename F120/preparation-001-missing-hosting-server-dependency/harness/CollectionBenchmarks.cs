// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class CollectionBenchmarks
{
    private CollectionScenario _scenario = null!;

    [ParamsAllValues]
    public CollectionProfile Profile { get; set; }

    [GlobalSetup]
    public async Task Setup()
    {
        _scenario = await CollectionScenario.CreateAsync(Profile, enableActionInvokers: false).ConfigureAwait(false);
    }

    [Benchmark]
    public bool Contains() => _scenario.Factories.Contains(_scenario.Probe);

    [Benchmark]
    public int UnchangedIndexOf() => _scenario.Factories.IndexOf(_scenario.Probe);

    [GlobalCleanup]
    public void Cleanup()
    {
        _scenario.Validate();
        Evidence.Write("actual-prepared-collection-lifetime", new
        {
            actualProfile = Profile.ToString(),
            actualFactoryCount = _scenario.Factories.Count,
            actualHostAndHttpClientDisposedBeforeTiming = true,
            actualCreationAndFirstWriteOutsideTiming = true,
            actualStableContainsAndIndexOf = true
        });
    }
}
