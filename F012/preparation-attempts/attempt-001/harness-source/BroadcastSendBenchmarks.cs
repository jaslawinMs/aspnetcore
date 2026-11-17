using System.Collections.ObjectModel;
using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public enum Shape
{
    NoConnections512,
    OneEmpty,
    Small4List2,
    C32List64,
    C32Array64,
    C32ReadOnly64,
    C128List256,
    C128Array256,
    C32AllList,
    C32AllArray,
    C32HalfList,
    C32DupList64,
}

public class BroadcastSendBenchmarks
{
    private BroadcastSendFixture _fixture = null!;

    [ParamsAllValues]
    public Shape Shape { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        var connectionCount = Shape switch
        {
            Shape.NoConnections512 => 0,
            Shape.OneEmpty => 1,
            Shape.Small4List2 => 4,
            Shape.C128List256 or Shape.C128Array256 => 128,
            _ => 32,
        };
        var ids = Enumerable.Range(0, connectionCount).Select(index => $"c{index:D4}").ToArray();
        var exclusionSize = Shape switch
        {
            Shape.NoConnections512 => 512,
            Shape.OneEmpty => 0,
            Shape.Small4List2 => 2,
            Shape.C128List256 or Shape.C128Array256 => 256,
            Shape.C32AllList or Shape.C32AllArray => 32,
            Shape.C32HalfList => 16,
            _ => 64,
        };
        var values = Enumerable.Range(0, exclusionSize).Select(index => $"missing-{index:D4}").ToArray();
        var expectedRecipients = ids;
        if (Shape is Shape.C32AllList or Shape.C32AllArray)
        {
            values = ids.ToArray();
            expectedRecipients = [];
        }
        else if (Shape is Shape.C32HalfList)
        {
            values = ids.Where((_, index) => index % 2 == 0).ToArray();
            expectedRecipients = ids.Where((_, index) => index % 2 != 0).ToArray();
        }
        else if (Shape is Shape.C32DupList64)
        {
            Array.Fill(values, ids[0]);
            expectedRecipients = ids[1..];
        }
        else if (Shape is Shape.NoConnections512)
        {
            expectedRecipients = [];
        }
        IReadOnlyList<string> excluded = Shape switch
        {
            Shape.C32Array64 or Shape.C128Array256 or Shape.C32AllArray or Shape.NoConnections512 or Shape.OneEmpty => values,
            Shape.C32ReadOnly64 => new ReadOnlyCollection<string>(values.ToList()),
            _ => values.ToList(),
        };
        _fixture = new BroadcastSendFixture(ids, excluded, expectedRecipients, ["World"]);
        Send().GetAwaiter().GetResult();
        _fixture.Validate();
        Evidence.Write("setup-preflight", new { shape = Shape.ToString(), connectionCount, exclusionSize, actual = _fixture.Observe() });
        _fixture.Reset();
    }

    [Benchmark]
    public Task Send() => _fixture.Send();

    [GlobalCleanup]
    public void Validate()
    {
        _fixture.Validate();
        Evidence.Write("benchmark-validated", new { shape = Shape.ToString(), actual = _fixture.Observe() });
        _fixture.DisposeAsync().GetAwaiter().GetResult();
    }
}
