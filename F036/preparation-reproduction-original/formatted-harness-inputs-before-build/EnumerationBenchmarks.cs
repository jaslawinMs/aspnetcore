// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class EnumerationBenchmarks
{
    private Scenario _scenario = null!;

    [Params(0, 1, 8, 64)]
    public int Count { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _scenario = new Scenario(Count);
        Evidence.Write("benchmark-setup", new
        {
            count = Count,
            actualPreparedTopLevelType = _scenario.TopLevel.GetType().FullName,
            actualPreparedTypedType = _scenario.Typed.GetType().FullName,
            actualPreparationConstructionAndAllWritesOutsideTiming = true,
            actualSourceVariant = "original",
            actualSettings = SettingsPreservingEmitToolchain.ReadSettings(),
        });
    }

    // Keep each receiver's static type at its own foreach call site.
    [Benchmark]
    public int TopLevelConcrete()
    {
        var score = 17;
        foreach (var pair in _scenario.TopLevel)
        {
            score = unchecked(score * 31 + Scenario.Score(pair));
        }

        return score;
    }

    [Benchmark]
    public int TopLevelInterface()
    {
        var score = 17;
        foreach (var pair in _scenario.Generic)
        {
            score = unchecked(score * 31 + Scenario.Score(pair));
        }

        return score;
    }

    [Benchmark]
    public int TypedConcrete()
    {
        var score = 17;
        foreach (var pair in _scenario.Typed)
        {
            score = unchecked(score * 31 + Scenario.Score(pair));
        }

        return score;
    }

    [Benchmark]
    public int ReadCopy()
    {
        var score = 17;
        foreach (var pair in _scenario.ReadCopy)
        {
            score = unchecked(score * 31 + Scenario.Score(pair));
        }

        return score;
    }

    [Benchmark]
    public int NestedCopy()
    {
        var score = 17;
        foreach (var pair in _scenario.NestedCopy)
        {
            score = unchecked(score * 31 + Scenario.Score(pair));
        }

        return score;
    }

    [Benchmark]
    public int MaterializedCopy()
    {
        var score = 17;
        foreach (var pair in _scenario.MaterializedCopy)
        {
            score = unchecked(score * 31 + Scenario.Score(pair));
        }

        return score;
    }

    [Benchmark]
    public int NonGeneric()
    {
        var score = 17;
        foreach (var item in _scenario.NonGeneric)
        {
            if (item is not KeyValuePair<string, object?> pair)
            {
                throw new InvalidOperationException("ViewData nongeneric Current must contain a key/value pair.");
            }
            score = unchecked(score * 31 + Scenario.Score(pair));
        }

        return score;
    }

    [Benchmark]
    public int DictionaryConcreteControl()
    {
        var score = 17;
        foreach (var pair in _scenario.Dictionary)
        {
            score = unchecked(score * 31 + Scenario.Score(pair));
        }

        return score;
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        Evidence.Write("benchmark-cleanup", new
        {
            count = Count,
            actualOwnedNativeOrExternalResources = 0,
            actualSourceVariant = "original",
            actualSettings = SettingsPreservingEmitToolchain.ReadSettings(),
        });
    }
}
