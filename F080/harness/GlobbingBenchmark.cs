using BenchmarkDotNet.Attributes;

namespace AutoPerf;

[MemoryDiagnoser]
public class GlobbingBenchmark
{
    private GlobbingFixture _fixture = null!;

    public IEnumerable<string> Cases => GlobbingCases.All.Select(profile => profile.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    [GlobalSetup]
    public void Setup()
    {
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
        _fixture = new GlobbingFixture(GlobbingCases.All.Single(profile => profile.Name == Case));
        _fixture.Validate();
    }

    [Benchmark]
    public int Exercise()
    {
        return _fixture.Exercise();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.Validate();
        _fixture.Dispose();
    }
}
