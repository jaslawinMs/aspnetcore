using BenchmarkDotNet.Attributes;

namespace AutoPerf;

[MemoryDiagnoser]
public class JsonPatchBenchmark
{
    private JsonPatchFixture _fixture = null!;
    public IEnumerable<string> Cases => JsonPatchFixture.Cases;
    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    [GlobalSetup]
    public void Setup()
    {
        Console.WriteLine($"AUTOPERF_OWNER_SHA256={OwnerIdentity.Hash()}");
        _fixture = new JsonPatchFixture(Case);
        _fixture.Capture();
    }

    [Benchmark]
    public object Apply()
    {
        return _fixture.Apply();
    }
}

[MemoryDiagnoser]
public class JsonPatchColdBenchmark
{
    private JsonPatchColdFixture _fixture = null!;
    public IEnumerable<string> Cases => JsonPatchColdFixture.Cases;
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
        _fixture = new JsonPatchColdFixture(Case);
    }

    [Benchmark(OperationsPerInvoke = JsonPatchColdFixture.BatchSize)]
    public object ApplyBatch()
    {
        return _fixture.ApplyBatch();
    }
}
