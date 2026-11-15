using BenchmarkDotNet.Attributes;

namespace AutoPerf;

[MemoryDiagnoser]
public class DirectoryBenchmark
{
    private DirectoryFixture _fixture = null!;
    public IEnumerable<string> Cases => DirectoryProfiles.All.Select(p => p.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    [GlobalSetup]
    public void Setup()
    {
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
        _fixture = new DirectoryFixture(DirectoryProfiles.All.Single(p => p.Name == Case));
        _fixture.CaptureContract().GetAwaiter().GetResult();
    }

    [Benchmark]
    public Task Exercise()
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
