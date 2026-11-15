using BenchmarkDotNet.Attributes;

namespace AutoPerf;

[MemoryDiagnoser]
public class MicrosoftAccountBenchmark
{
    private MicrosoftFixture _fixture = null!;

    public IEnumerable<string> Cases => MicrosoftProfiles.All.Select(p => p.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    [GlobalSetup]
    public void Setup()
    {
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
        _fixture = new MicrosoftFixture(MicrosoftProfiles.All.Single(p => p.Name == Case));
        _fixture.CaptureContract().GetAwaiter().GetResult();
    }

    [Benchmark]
    public Task<int> Exercise()
    {
        return _fixture.Exercise();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.CaptureContract().GetAwaiter().GetResult();
        _fixture.Dispose();
    }
}
