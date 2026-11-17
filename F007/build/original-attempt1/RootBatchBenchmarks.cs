using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Whole actual Server JSON batch calls;no copied membership loop.</summary>
public class RootBatchBenchmarks
{
    private ServerAdapter _adapter = null!;
    private object _owner = null!;
    private BatchSample _sample = null!;

    [ParamsAllValues]
    public Shape Shape { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _adapter = new();
        _owner = _adapter.CreateOwner();
        _sample = BatchSamples.Timed(_adapter, Shape);
        _sample.WriteProof(_adapter, "timed-full-owner-global-setup");
        _sample.Validate(_adapter, _owner);
    }

    [Benchmark]
    public bool DeserializeBatch() =>
        _adapter.Parse(_owner, _sample.Json, out _, _sample.DeserializeMarkers);

    [GlobalCleanup]
    public void Cleanup() => _adapter.Dispose();
}
