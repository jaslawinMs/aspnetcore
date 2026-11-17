// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Original-only controlled parent and partial rendering diagnostics.</summary>
public class RenderPartialBenchmarks
{
    private RenderPartialFixture _fixture = null!;

    /// <summary>Gets or sets the existing API and completed literal payload profile.</summary>
    [ParamsSource(nameof(Cases))]
    public string Profile { get; set; } = "";

    /// <summary>Gets the four predeclared original-only profiles.</summary>
    public IEnumerable<string> Cases => RenderPartialContracts.Profiles;

    /// <summary>Initializes the actual owning components without changing process settings.</summary>
    [GlobalSetup]
    public void Setup()
    {
        _fixture = new RenderPartialFixture();
        var operation = _fixture.RenderAndConsumeAsync(Profile);
        Evidence.Require(operation.IsCompletedSuccessfully &&
            operation.GetAwaiter().GetResult() == (Profile.EndsWith("4096", StringComparison.Ordinal) ? 4116 : 52),
            "Original completed parent/partial wrapper did not consume ordered writer output.");
        Evidence.Write("benchmark-setup", new
        {
            Profile,
            processId = Environment.ProcessId,
            actualCompletedParentAndPartialWrapper = true,
            sourceComparison = false,
            actualOwnerSha256 = Evidence.Hash(typeof(Microsoft.AspNetCore.Mvc.ViewFeatures.HtmlHelper).Assembly.Location),
            actualRendererSha256 = Evidence.Hash(typeof(Microsoft.AspNetCore.Mvc.Razor.RazorView).Assembly.Location),
            actualHarnessSha256 = Evidence.Hash(typeof(RenderPartialBenchmarks).Assembly.Location),
        });
    }

    /// <summary>Renders both real views and consumes the caller-owned root writer.</summary>
    [Benchmark]
    public Task<int> RenderAndConsume()
    {
        return _fixture.RenderAndConsumeAsync(Profile);
    }

    /// <summary>Disposes the fixture after all per-operation request scopes have been returned.</summary>
    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.Dispose();
    }
}
