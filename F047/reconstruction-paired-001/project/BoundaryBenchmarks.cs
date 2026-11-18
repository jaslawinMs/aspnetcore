// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class BoundaryBenchmarks
{
    private BoundaryScenario _scenario = null!;

    [ParamsAllValues]
    public BoundaryProfile Profile { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _scenario = new BoundaryScenario(Profile);
    }

    [Benchmark]
    public int FreshBoundarySetAndDispose() => _scenario.Run();

    [GlobalCleanup]
    public void Cleanup()
    {
        _scenario.Dispose();
        Evidence.Write("actual-benchmark-lifetimes", new { profile = Profile.ToString(),
            actualCreated = _scenario.Created, actualDisposed = _scenario.Disposed,
            actualNoRetainedRootsOrChildren = _scenario.Created == _scenario.Disposed });
    }
}
