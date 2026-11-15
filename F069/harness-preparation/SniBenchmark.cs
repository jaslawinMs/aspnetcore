using BenchmarkDotNet.Attributes;
using System.Net.Security;

namespace AutoPerf;

[MemoryDiagnoser]
public class SniSelectionBenchmark
{
    [ParamsSource(nameof(Recipes))]
    public string Recipe { get; set; } = "";
    public static IEnumerable<string> Recipes => CaseSpec.All.Select(spec => spec.Name);
    private SniFixture _fixture = null!;

    [GlobalSetup]
    public void Setup()
    {
        OwnerProbe.Verify();
        _fixture = new SniFixture(CaseSpec.All.Single(spec => spec.Name == Recipe));
        _fixture.Verify();
    }

    [Benchmark]
    public SslServerAuthenticationOptions SelectOptions()
    {
        return _fixture.Select();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.Dispose();
    }
}

[MemoryDiagnoser]
public class SniConstructionBenchmark
{
    [Params(1, 8, 64, 512)]
    public int Patterns { get; set; }
    private SniFixture _fixture = null!;

    [GlobalSetup]
    public void Setup()
    {
        OwnerProbe.Verify();
        _fixture = new SniFixture(new("Construct", Patterns, "client.p000.sni.test", "ordinary"), constructorProfile: true);
    }

    [Benchmark]
    public object ConstructSelector()
    {
        return _fixture.Construct();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.Dispose();
    }
}
