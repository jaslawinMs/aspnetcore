using BenchmarkDotNet.Attributes;

namespace AutoPerf;

[MemoryDiagnoser]
public class LoaderBenchmark
{
    private LoaderLifecycle _lifecycle = null!;
    [ParamsSource(nameof(Profiles))]
    public string Profile { get; set; } = null!;
    public static IEnumerable<string> Profiles => LoaderLifecycle.Profiles;

    [GlobalSetup(Target = nameof(LegacyBridge))]
    public void SetupLegacy() => Setup(nameof(LegacyBridge));
    [GlobalSetup(Target = nameof(ModernWait))]
    public void SetupModernWait() => Setup(nameof(ModernWait));
    [GlobalSetup(Target = nameof(ModernAsync))]
    public void SetupModernAsync() => Setup(nameof(ModernAsync));

    private void Setup(string caller)
    {
        _lifecycle = new LoaderLifecycle(Profile);
        var receipt = Verify(_lifecycle, caller);
        Evidence.Write(caller + "-" + Profile, receipt);
        Console.WriteLine("AUTOPERF_F095_SETUP " + Evidence.Compact(receipt));
    }

    internal static object Verify(LoaderLifecycle lifecycle, string caller)
    {
        for (var index = 0; index < 2; index++)
        {
            if (caller == nameof(ModernAsync))
            {
                lifecycle.RunAsync(capture: true).GetAwaiter().GetResult();
            }
            else
            {
                lifecycle.RunSync(obsoleteCaller: caller == nameof(LegacyBridge), capture: true);
            }
        }
        return new
        {
            caller, profile = lifecycle.Last.Profile, actualSetupRuns = 2,
            ownerSha256 = Evidence.OwnerSha256, harnessSha256 = Evidence.HarnessSha256,
            processId = Environment.ProcessId, signature = lifecycle.Last
        };
    }

    [Benchmark]
    public int LegacyBridge() => _lifecycle.RunSync(obsoleteCaller: true);
    [Benchmark]
    public int ModernWait() => _lifecycle.RunSync(obsoleteCaller: false);
    [Benchmark]
    public Task<int> ModernAsync() => _lifecycle.RunAsync();
    [GlobalCleanup]
    public void Cleanup() => _lifecycle.Dispose();
}
