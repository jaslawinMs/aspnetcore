// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class DictionaryReplaceBenchmarks
{
    private ReplaceScenario _scenario = null!;

    [Params(1, 64)]
    public int Count { get; set; }

    [Params("ParsedObjectExisting", "ProgrammaticIntExisting", "ParsedIntExisting",
        "ParsedObjectMissing", "ProgrammaticNullExisting", "ParsedObjectTestControl")]
    public string Profile { get; set; } = string.Empty;

    [GlobalSetup]
    public void Setup()
    {
        _scenario = new ReplaceScenario(Count, Profile);
        _scenario.Verify();
    }

    [Benchmark]
    public int ApplyAndObserve()
    {
        return _scenario.ApplyAndObserve();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _scenario.Verify();
    }
}
