// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Measures ranged full-request writes and separately prepared live-request zero-byte writes.</summary>
public class WriteBenchmarks
{
    private HttpSysFixture? _fixture;
    private RequestHandle? _live;

    /// <summary>Gets the predeclared full-request and live-stream profiles.</summary>
    public IEnumerable<string> Cases => WriteContracts.Profiles;

    /// <summary>Gets or sets the actual selected consumer boundary.</summary>
    [ParamsSource(nameof(Cases))]
    public string Profile { get; set; } = WriteContracts.Profiles[0];

    /// <summary>Starts an owned actual HTTP.sys host and verifies the reached producer boundary.</summary>
    [GlobalSetup]
    public void Setup() => SetupAsync().GetAwaiter().GetResult();

    private async Task SetupAsync()
    {
        _fixture = new HttpSysFixture();
        await _fixture.StartAsync().ConfigureAwait(false);
        var plan = WritePlan.Create(Profile);
        if (plan.Live)
        {
            _live = _fixture.Begin(plan);
            await plan.LiveReady.Task.WaitAsync(WritePlan.Timeout).ConfigureAwait(false);
            await _live.Headers.WaitAsync(WritePlan.Timeout).ConfigureAwait(false);
            Evidence.Require(!plan.ApplicationFinished.Task.IsCompleted, "Native request must remain alive during prepared measurements.");
        }
        await WriteAndConsumeAsync().ConfigureAwait(false);
        Evidence.Write("benchmark-reached", new
        {
            profile = Profile,
            actualLivePlan = _live?.Plan.Capture(),
            actualFullRequestConsumed = _live is null,
            actualNoNewNetworkIoPerPreparedLiveZeroWrite = _live is not null,
            actualHostStarted = true,
        });
        Evidence.Runtime("benchmark-setup-" + Profile);
    }

    /// <summary>Consumes one full ranged-write request or completes one zero-byte write on a still-live prepared response.</summary>
    [Benchmark]
    public Task<int> WriteAndConsumeAsync()
    {
        if (_live is { } live)
        {
            return WriteLiveAsync(live.Plan);
        }
        var fixture = _fixture ?? throw new InvalidOperationException("Actual benchmark host absent.");

        return CompleteRequestAsync(fixture);
    }

    private static async Task<int> WriteLiveAsync(WritePlan plan)
    {
        if (plan.Async)
        {
            await plan.Context.Response.Body.WriteAsync(
                WritePlan.EmptyBuffer.AsMemory(WritePlan.BufferOffset, 0), CancellationToken.None).ConfigureAwait(false);
        }
        else
        {
            plan.Context.Response.Body.Write(WritePlan.EmptyBuffer, WritePlan.BufferOffset, 0);
        }

        return 1;
    }

    private async Task<int> CompleteRequestAsync(HttpSysFixture fixture)
    {
        var request = fixture.Begin(WritePlan.Create(Profile));
        await using var requestLifetime = request.ConfigureAwait(false);

        return await request.ConsumeAsync().ConfigureAwait(false);
    }

    /// <summary>Releases held requests and closes the actual owned client and native listener.</summary>
    [GlobalCleanup]
    public void Cleanup() => CleanupAsync().GetAwaiter().GetResult();

    private async Task CleanupAsync()
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
