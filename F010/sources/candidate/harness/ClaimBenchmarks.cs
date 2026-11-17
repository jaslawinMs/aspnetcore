using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Authorization;

namespace AutoPerf;

public class ClaimBenchmarks
{
    private ClaimScenario _scenario = null!;

    [ParamsAllValues]
    public Shape Shape { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _scenario = ClaimSamples.Create(Shape);
        var record = _scenario.Observe("actual-benchmark-setup-" + Shape, Authorize().GetAwaiter().GetResult(), _scenario.Expected,
            "Actual timed public Task-returning wrapper preflighted;timed body only calls real registered service,without per-call assertions or telemetry observer.");
        if (record.ExactHashSet && Shape != Shape.Ignore64)
        {
            Evidence.Require(record.KnownOrdinalComparer || record.KnownDefaultComparer, "Actual timed direct-set guard precondition absent.");
        }
        Evidence.Write("benchmark-setup", record);
    }

    [Benchmark]
    public Task<AuthorizationResult> Authorize() => _scenario.Authorize();

    [GlobalCleanup]
    public void Cleanup() => _scenario.Dispose();
}
