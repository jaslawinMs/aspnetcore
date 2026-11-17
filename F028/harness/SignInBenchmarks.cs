using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class SignInBenchmarks
{
    private SignInFixture _fixture = null!;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    public IEnumerable<string> Cases => SignInProfiles.All;

    [GlobalSetup]
    public void Setup()
    {
        _fixture = new SignInFixture(Case);
        _fixture.CaptureContract("setup");
        Evidence.Write("settings-setup", SettingsPreservingEmitToolchain.ReadSettings());
    }

    [Benchmark]
    public Task<int> ResolveAndConsume()
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
