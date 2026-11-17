// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Measures the actual synchronous template helper and returned-content consumption.</summary>
public class TemplateBenchmarks
{
    private readonly TemplateFixture _fixture = new();

    /// <summary>Gets the predeclared completed custom-template and built-in display controls.</summary>
    public IEnumerable<string> Cases => TemplateContracts.Profiles;

    /// <summary>Gets or sets the selected real helper profile.</summary>
    [ParamsSource(nameof(Cases))]
    public string Profile { get; set; } = TemplateContracts.Profiles[0];

    /// <summary>Verifies the actual reached profile outside timing.</summary>
    [GlobalSetup]
    public void Setup()
    {
        using var request = _fixture.CreateRequest(Profile);
        request.Call();
        Evidence.Write("benchmark-reached", request.Capture(Profile, success: true));
        Evidence.Runtime("benchmark-setup-" + Profile);
    }

    /// <summary>Renders and consumes one actual Display or Editor invocation.</summary>
    [Benchmark]
    public int RenderAndConsume()
    {
        return _fixture.RenderAndConsume(Profile);
    }

    /// <summary>Disposes the benchmark-owned root provider and diagnostics.</summary>
    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.Dispose();
    }
}
