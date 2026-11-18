// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class SectionRegistrationBenchmarks
{
    private RegistrationScenario _scenario = null!;

    [Params("NoSections", "One", "Two", "Eight", "SixtyFour", "EightLong")]
    public string Profile { get; set; } = string.Empty;

    [GlobalSetup]
    public void Setup()
    {
        _scenario = new RegistrationScenario(RegistrationSpec.All.Single(spec => spec.Name == Profile));
        Evidence.Write("setup-verified", new
        {
            actualPid = Environment.ProcessId,
            actualOwner = typeof(Microsoft.AspNetCore.Mvc.Razor.RazorPageBase).Assembly.Location,
            actualHarness = typeof(SectionRegistrationBenchmarks).Assembly.Location,
            actualProof = _scenario.Verify()
        });
    }

    [Benchmark]
    public int RegisterFreshPage() => _scenario.RegisterFreshPage();

    [Benchmark]
    public Task<int> RenderFullView() => _scenario.RenderFullView();

    [GlobalCleanup]
    public void Cleanup()
    {
        _scenario.Dispose();
    }
}
