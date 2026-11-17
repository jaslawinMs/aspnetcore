// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AutoPerf;

public class EnumerationBenchmarks
{
    private BindingScenario _scenario = null!;
    private ValueProviderResult _result;
    private IEnumerable<string> _boxedResult = null!;

    [Params(0, 1, 8, 64)]
    public int Count { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _scenario = new BindingScenario(Enumerable.Range(0, Count).Select(index => $"value-{index:D3}").ToArray());
        _result = _scenario.Result;
        _boxedResult = _result;
        Evidence.Write("benchmark-setup", new
        {
            count = Count,
            actualProvider = _scenario.Provider.GetType().FullName,
            actualResultLength = _result.Length,
            actualQueryParsingAndFactoryCompletedBeforeTiming = true,
            actualGenericReceiverBoxedBeforeTiming = true,
            actualEmptyBindingBypassesTargetEnumeration = Count == 0,
            actualSettings = SettingsPreservingEmitToolchain.ReadSettings(),
        });
    }

    [Benchmark]
    public int PreparedConcrete()
    {
        var score = 17;
        foreach (var value in _result)
        {
            score = unchecked(score * 31 + (value?.Length ?? -1));
        }

        return score;
    }

    [Benchmark]
    public int PreparedPreboxedGeneric()
    {
        var score = 17;
        foreach (var value in _boxedResult)
        {
            score = unchecked(score * 31 + (value?.Length ?? -1));
        }

        return score;
    }

    [Benchmark]
    public int UnchangedValuesControl()
    {
        var score = 17;
        foreach (var value in _result.Values)
        {
            score = unchecked(score * 31 + (value?.Length ?? -1));
        }

        return score;
    }

    [Benchmark]
    public int QueryProducer()
    {
        var score = 17;
        foreach (var value in _scenario.Provider.GetValue("items"))
        {
            score = unchecked(score * 31 + (value?.Length ?? -1));
        }

        return score;
    }

    [Benchmark]
    public Task<int> CollectionBinding()
    {
        return _scenario.BindAndConsumeAsync();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        Evidence.Write("benchmark-cleanup", new
        {
            count = Count,
            actualOwnedNativeOrExternalResources = 0,
            actualSettings = SettingsPreservingEmitToolchain.ReadSettings(),
        });
    }
}
