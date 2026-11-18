// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Components.Forms;

namespace AutoPerf;

/// <summary>Original-only complete static form rendering, not an isolated lookup or optimization comparison.</summary>
public class FieldRegistryBenchmarks
{
    private FormScenario _scenario = default!;
    private EditContext _warmContext = default!;
    private EditContext? _lastContext;
    private int _callsBefore;

    [Params(1, 8, 64)]
    public int FieldCount { get; set; }

    [Params("Cold", "Warm")]
    public string RegistryState { get; set; } = string.Empty;

    [GlobalSetup]
    public async Task SetupAsync()
    {
        Evidence.Require(RegistryState is "Cold" or "Warm", "Use a predeclared original-only registry state.");
        _scenario = new FormScenario(FieldCount, "fields");
        _warmContext = _scenario.CreateContext();
        _ = await _scenario.VerifyRenderAsync(_warmContext);
        _callsBefore = _scenario.Provider.Calls;
        Evidence.Write("lifecycle-setup", new { FieldCount, RegistryState, actualOriginalOwnerProducedFields = true,
            actualFreshInputInstancesEveryRender = true, actualWholeRenderAndObserverOverheadTimed = true });
    }

    [Benchmark]
    public Task<string> RenderForm()
    {
        _lastContext = RegistryState == "Cold" ? _scenario.CreateContext() : _warmContext;

        return _scenario.RenderAsync(_lastContext);
    }

    [GlobalCleanup]
    public async Task CleanupAsync()
    {
        Evidence.Require(_lastContext is not null && _scenario.Provider.Calls > _callsBefore &&
            ReferenceEquals(_scenario.Provider.Context, _lastContext), "The actual input/field consumer must run after setup.");
        _scenario.VerifyContext(_lastContext!);
        await _scenario.DisposeAsync();
        Evidence.Write("lifecycle-cleanup", new { FieldCount, RegistryState,
            actualWorkloadConsumerCalls = _scenario.Provider.Calls - _callsBefore,
            actualApplicationPropertyPreserved = true, actualServiceProviderDisposed = true });
    }
}
