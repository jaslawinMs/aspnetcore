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
    public void CopyTo() => _scenario.Factories.CopyTo(_scenario.Destination, _scenario.Offset);

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
            actualOffset = _scenario.Offset,
            actualHostAndHttpClientDisposedBeforeTiming = true,
            actualCreationAndFirstWriteOutsideTiming = true,
            actualDestinationAllocationOutsideTiming = true,
            actualStableCopyToAndIndexOf = true
        });
    }
}
