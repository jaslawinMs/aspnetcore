using BenchmarkDotNet.Attributes;

namespace AutoPerf;

[MemoryDiagnoser]
public class SectionBenchmark
{
    private SectionLifecycle _lifecycle = null!;
    [ParamsSource(nameof(Profiles))]
    public string Profile { get; set; } = null!;
    public static IEnumerable<string> Profiles => SectionSpec.All.Select(spec => spec.Name);

    [GlobalSetup(Target = nameof(PageSync))]
    public void SetupPageSync() => Setup(nameof(PageSync), fullView: false, asyncCaller: false);
    [GlobalSetup(Target = nameof(PageAsync))]
    public void SetupPageAsync() => Setup(nameof(PageAsync), fullView: false, asyncCaller: true);
    [GlobalSetup(Target = nameof(ViewSync))]
    public void SetupViewSync() => Setup(nameof(ViewSync), fullView: true, asyncCaller: false);
    [GlobalSetup(Target = nameof(ViewAsync))]
    public void SetupViewAsync() => Setup(nameof(ViewAsync), fullView: true, asyncCaller: true);

    private void Setup(string method, bool fullView, bool asyncCaller)
    {
        _lifecycle = new SectionLifecycle(SectionSpec.All.Single(spec => spec.Name == Profile));
        var receipt = Verify(_lifecycle, method, fullView, asyncCaller);
        Evidence.Write(method + "-" + Profile, receipt);
        Console.WriteLine("AUTOPERF_F094_SETUP " + Evidence.Compact(receipt));
    }

    internal static object Verify(SectionLifecycle lifecycle, string method, bool fullView, bool asyncCaller)
    {
        for (var index = 0; index < 2; index++)
        {
            if (asyncCaller)
            {
                lifecycle.RunAsync(fullView).GetAwaiter().GetResult();
            }
            else
            {
                lifecycle.RunSync(fullView);
            }
        }
        return new
        {
            method, profile = lifecycle.Last.Profile, actualSetupRuns = 2,
            ownerSha256 = Evidence.OwnerSha256, harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId, signature = lifecycle.Last
        };
    }

    [Benchmark]
    public int PageSync() => _lifecycle.RunSync(fullView: false);
    [Benchmark]
    public Task<int> PageAsync() => _lifecycle.RunAsync(fullView: false);
    [Benchmark]
    public int ViewSync() => _lifecycle.RunSync(fullView: true);
    [Benchmark]
    public Task<int> ViewAsync() => _lifecycle.RunAsync(fullView: true);

    [GlobalCleanup]
    public void Cleanup() => _lifecycle.Dispose();
}
