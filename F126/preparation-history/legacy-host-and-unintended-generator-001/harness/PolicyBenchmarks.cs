// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Authorization;

namespace AutoPerf;

public class PolicyBenchmarks
{
    private PolicyScenario _scenario = null!;

    [Params("MinimumAge10", "MinimumAge50")]
    public string Profile { get; set; } = string.Empty;

    [GlobalSetup]
    public void Setup()
    {
        _scenario = PolicyScenario.Get(Profile);
        Evidence.Write("case-setup", new
        {
            actualProfile = Profile, actualSetupOnlySelectedPreparedHosts = true,
            actualPrimary = _scenario.Primary.Provider.Counts(), actualDisabled = _scenario.Disabled.Provider.Counts()
        });
    }

    [Benchmark]
    public Task<int> WarmRequest() => _scenario.Primary.RequestAsync(_scenario.Profile.Path);

    [Benchmark]
    public Task<int> CachingDisabledRequest() => _scenario.Disabled.RequestAsync(_scenario.Profile.Path);

    [Benchmark]
    public Task<AuthorizationPolicy?> DirectGetPolicy() => _scenario.Primary.Provider.Inner.GetPolicyAsync(_scenario.Profile.PolicyName);

    [GlobalCleanup]
    public void Cleanup()
    {
        Evidence.Write("case-cleanup", new
        {
            actualProfile = Profile, actualPrimary = _scenario.Primary.Provider.Counts(),
            actualDisabled = _scenario.Disabled.Provider.Counts()
        });
    }
}
