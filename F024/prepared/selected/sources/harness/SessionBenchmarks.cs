using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class SessionBenchmarks
{
    private SessionFixture _fixture = null!;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    public IEnumerable<string> Cases => SessionProfiles.All;

    [GlobalSetup]
    public void Setup()
    {
        _fixture = new SessionFixture(Case);
        _fixture.CaptureContract("setup");
        Evidence.Write("settings-setup", SettingsPreservingEmitToolchain.ReadSettings());
    }

    [Benchmark]
    public Task<int> CreateUseConsume()
    {
        return _fixture.ExerciseAsync();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.CaptureContract("cleanup");
        _fixture.Dispose();
    }
}
