// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Measures real full-request flushes and separately prepared live-request flush calls.</summary>
public class FlushBenchmarks
{
    private HttpSysFixture? _fixture;
    private RequestHandle? _live;

    /// <summary>Gets the predeclared full-request and live-stream profiles.</summary>
    public IEnumerable<string> Cases => FlushContracts.Profiles;

    /// <summary>Gets or sets the actual selected consumer boundary.</summary>
    [ParamsSource(nameof(Cases))]
    public string Profile { get; set; } = FlushContracts.Profiles[0];

    /// <summary>Starts an owned actual HTTP.sys host and verifies the reached producer boundary.</summary>
    [GlobalSetup]
    public async Task Setup()
    {
        _fixture = new HttpSysFixture();
        await _fixture.StartAsync().ConfigureAwait(false);
        var plan = FlushPlan.Create(Profile);
        if (plan.Live)
        {
            _live = _fixture.Begin(plan);
            await plan.LiveReady.Task.WaitAsync(FlushPlan.Timeout).ConfigureAwait(false);
            await _live.Headers.WaitAsync(FlushPlan.Timeout).ConfigureAwait(false);
            Evidence.Require(!plan.ApplicationFinished.Task.IsCompleted, "Native request must remain alive during prepared measurements.");
        }
        await FlushAndConsumeAsync().ConfigureAwait(false);
        Evidence.Write("benchmark-reached", new
        {
            profile = Profile,
            actualLivePlan = _live?.Plan.Capture(),
            actualFullRequestConsumed = _live is null,
            actualNoNewNetworkIoPerPreparedLiveFlush = _live is not null,
            actualHostStarted = true,
        });
        Evidence.Runtime("benchmark-setup-" + Profile);
    }

    /// <summary>Completes one full request or one flush on an actual still-live prepared response.</summary>
    [Benchmark]
    public Task<int> FlushAndConsumeAsync()
    {
        if (_live is { } live)
        {
            return FlushLiveAsync(live.Plan);
        }
        var fixture = _fixture ?? throw new InvalidOperationException("Actual benchmark host absent.");

        return CompleteRequestAsync(fixture);
    }

    private static async Task<int> FlushLiveAsync(FlushPlan plan)
    {
        if (plan.Async)
        {
            await plan.Context.Response.Body.FlushAsync(CancellationToken.None).ConfigureAwait(false);
        }
        else
        {
            plan.Context.Response.Body.Flush();
        }

        return 1;
    }

    private async Task<int> CompleteRequestAsync(HttpSysFixture fixture)
    {
        await using var request = fixture.Begin(FlushPlan.Create(Profile));

        return await request.ConsumeAsync().ConfigureAwait(false);
    }

    /// <summary>Releases held requests and closes the actual owned client and native listener.</summary>
    [GlobalCleanup]
    public async Task Cleanup()
    {
        try
        {
            if (_live is not null)
            {
                await _live.DisposeAsync().ConfigureAwait(false);
            }
        }
        finally
        {
            if (_fixture is not null)
            {
                await _fixture.DisposeAsync().ConfigureAwait(false);
            }
        }
    }
}
