// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Measures complete prepared public-renderer list updates.</summary>
public class KeyedRenderBenchmarks
{
    private RenderScenario _scenario = null!;

    /// <summary>Gets or sets the prepared sibling count.</summary>
    [Params(0, 1, 16, 256)]
    public int Count { get; set; }

    /// <summary>Gets or sets the prepared, uninstrumented key family.</summary>
    [Params(KeyKind.Integer, KeyKind.String)]
    public KeyKind Keys { get; set; }

    /// <summary>Gets or sets the actual renderer workload.</summary>
    [Params(WorkloadKind.KeyedStable, WorkloadKind.KeyedReorder, WorkloadKind.KeyedReplace,
        WorkloadKind.MixedKeyedUnkeyed, WorkloadKind.UnkeyedStable)]
    public WorkloadKind Workload { get; set; }

    /// <summary>Prepares and warms actual renderer-owned state outside timing.</summary>
    [GlobalSetup]
    public void Setup()
    {
        _scenario = new(Count, Keys, Workload, capture: false);
        Evidence.Complete(_scenario.RenderNextAsync());
        Evidence.Complete(_scenario.RenderNextAsync());
        _scenario.Validate();
        Evidence.Write("benchmark-setup", new { profile = _scenario.Profile,
            actualBatches = _scenario.Batches, actualFrames = _scenario.Snapshot(),
            settings = SettingsPreservingEmitToolchain.ReadSettings() });
    }

    /// <summary>Produces one complete actual render batch from prepared component state.</summary>
    [Benchmark]
    public Task Render() => _scenario.RenderNextAsync();

    /// <summary>Checks actual final state and releases renderer-owned resources.</summary>
    [GlobalCleanup]
    public void Cleanup()
    {
        _scenario.Validate();
        Evidence.Require(_scenario.Batches > 3, "The timed or lifecycle producer must actually render.");
        Evidence.Write("benchmark-cleanup", new { profile = _scenario.Profile,
            actualBatches = _scenario.Batches, actualFrames = _scenario.Snapshot(),
            settings = SettingsPreservingEmitToolchain.ReadSettings() });
        _scenario.Dispose();
    }
}
