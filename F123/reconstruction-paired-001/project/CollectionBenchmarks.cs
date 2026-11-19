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
    public void Setup()
    {
        _scenario = CollectionScenario.GetPreparedBenchmark(Profile);
    }

    [Benchmark]
    public int IndexOf() => _scenario.Factories.IndexOf(_scenario.Probe);

    [Benchmark]
    public bool UnchangedContains() => _scenario.Factories.Contains(_scenario.Probe);

    [GlobalCleanup]
    public void Cleanup()
    {
        _scenario.Validate();
        Evidence.Write("actual-prepared-collection-lifetime", new
        {
            actualProfile = Profile.ToString(), actualFactoryCount = _scenario.Factories.Count,
            actualExpectedIndex = _scenario.ExpectedIndex, actualExpectedContains = _scenario.ExpectedIndex >= 0,
            actualHostAndHttpClientDisposedBeforeTiming = true,
            actualCreationAndFirstWriteOutsideTiming = true, actualStableIndexOfAndContains = true
        });
    }
}
