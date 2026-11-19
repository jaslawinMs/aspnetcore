// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using System.Runtime.CompilerServices;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Mvc.ModelBinding;

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
    public int EnumerateGeneric()
    {
        var checksum = 17;
        foreach (var factory in _scenario.Factories)
        {
            checksum = unchecked(checksum * 31 + RuntimeHelpers.GetHashCode(factory));
        }

        return checksum;
    }

    [Benchmark]
    public int EnumerateNonGeneric()
    {
        var checksum = 17;
        foreach (var factory in (IEnumerable)_scenario.Factories)
        {
            checksum = unchecked(checksum * 31 + RuntimeHelpers.GetHashCode(factory));
        }

        return checksum;
    }

    [Benchmark]
    public IEnumerator<IValueProviderFactory> RetainGenericEnumerator() => _scenario.Factories.GetEnumerator();

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
            actualStableEnumerationAndIndexOf = true,
            actualOnlyActualArrayOrListEnumeratorsRetained = true
        });
    }
}
