using BenchmarkDotNet.Attributes;

namespace AutoPerf;

[MemoryDiagnoser]
public class UnionBenchmark
{
    private UnionFixture _fixture = null!;
    public IEnumerable<string> Cases => UnionFixture.Cases;
    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    [GlobalSetup]
    public void Setup()
    {
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
        _fixture = new UnionFixture(Case);
        _fixture.Capture();
    }

    [Benchmark]
    public int Validate()
    {
        return _fixture.Validate();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.Dispose();
    }
}

[MemoryDiagnoser]
public class UnionColdBenchmark
{
    private UnionColdFixture? _fixture;
    public IEnumerable<string> Cases => UnionColdFixture.Cases;
    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    [GlobalSetup]
    public void Setup()
    {
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
    }

    [IterationSetup]
    public void FreshTypes()
    {
        _fixture?.Dispose();
        _fixture = new UnionColdFixture(Case);
    }

    [Benchmark(OperationsPerInvoke = UnionColdFixture.BatchSize)]
    public int ValidateBatch()
    {
        return _fixture!.ValidateBatch();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture?.Dispose();
    }
}
