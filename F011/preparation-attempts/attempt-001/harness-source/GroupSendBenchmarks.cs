using System.Collections.ObjectModel;
using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public enum Shape
{
    NoGroup512,
    OneEmpty,
    Small4List2,
    G32List64,
    G32Array64,
    G32ReadOnly64,
    G128List256,
    G128Array256,
    G32AllList,
    G32AllArray,
    G32HalfList,
    G32DupList64,
}

public class GroupSendBenchmarks
{
    private GroupSendFixture _fixture = null!;

    [ParamsAllValues]
    public Shape Shape { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        var groupSize = Shape switch
        {
            Shape.OneEmpty => 1,
            Shape.Small4List2 => 4,
            Shape.G128List256 or Shape.G128Array256 => 128,
            _ => 32,
        };
        var ids = Enumerable.Range(0, groupSize).Select(index => $"c{index:D4}").ToArray();
        var exclusionSize = Shape switch
        {
            Shape.NoGroup512 => 512,
            Shape.OneEmpty => 0,
            Shape.Small4List2 => 2,
            Shape.G128List256 or Shape.G128Array256 => 256,
            Shape.G32AllList or Shape.G32AllArray => 32,
            Shape.G32HalfList => 16,
            _ => 64,
        };
        var values = Enumerable.Range(0, exclusionSize).Select(index => $"missing-{index:D4}").ToArray();
        var expectedRecipients = ids;
        if (Shape is Shape.G32AllList or Shape.G32AllArray)
        {
            values = ids.ToArray();
            expectedRecipients = [];
        }
        else if (Shape is Shape.G32HalfList)
        {
            values = ids.Where((_, index) => index % 2 == 0).ToArray();
            expectedRecipients = ids.Where((_, index) => index % 2 != 0).ToArray();
        }
        else if (Shape is Shape.G32DupList64)
        {
            Array.Fill(values, ids[0]);
            expectedRecipients = ids[1..];
        }
        else if (Shape is Shape.NoGroup512)
        {
            expectedRecipients = [];
        }
        IReadOnlyList<string> excluded = Shape switch
        {
            Shape.G32Array64 or Shape.G128Array256 or Shape.G32AllArray or Shape.NoGroup512 or Shape.OneEmpty => values,
            Shape.G32ReadOnly64 => new ReadOnlyCollection<string>(values.ToList()),
            _ => values.ToList(),
        };
        _fixture = new GroupSendFixture(ids, excluded, expectedRecipients, ["World"],
            targetGroup: Shape is Shape.NoGroup512 ? "missing" : "group");
        Send().GetAwaiter().GetResult();
        _fixture.Validate();
        Evidence.Write("setup-preflight", new { shape = Shape.ToString(), groupSize, exclusionSize, actual = _fixture.Observe() });
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
