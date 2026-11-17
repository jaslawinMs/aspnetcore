using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Authentication.Google;

namespace AutoPerf;

[MemoryDiagnoser]
public class GoogleBenchmarks
{
    private GoogleFixture? _fixture;

    public IEnumerable<string> Cases => GoogleProfiles.All.Select(profile => profile.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    [GlobalSetup]
    public void Setup()
    {
        Evidence.Write("settings-setup", SettingsPreservingEmitToolchain.ReadSettings());
        Evidence.Write("executing-owner", new { shape = Case, ownerSha256 = Evidence.Hash(typeof(GoogleHandler).Assembly.Location) });
        _fixture = new GoogleFixture(GoogleProfiles.All.Single(profile => profile.Name == Case));
        _fixture.CaptureContract("setup").GetAwaiter().GetResult();
    }

    [Benchmark]
    public Task<int> Exercise()
    {
        return (_fixture ?? throw new InvalidOperationException("Actual Google fixture setup required.")).Exercise();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        var fixture = _fixture ?? throw new InvalidOperationException("Actual Google fixture setup required.");
        fixture.CaptureContract("cleanup").GetAwaiter().GetResult();
        fixture.Dispose();
    }
}
