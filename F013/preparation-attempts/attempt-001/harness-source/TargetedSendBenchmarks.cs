using System.Collections.ObjectModel;
using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public enum Shape
{
    NoConnections512,
    EmptyTargets,
    Small4List2,
    Threshold16List,
    Threshold17List,
    C32List64Miss,
    C32Array64Miss,
    C32ReadOnly64Miss,
    C128List256Miss,
    C128Array256Miss,
    C32List64Sparse,
    C32Array64Sparse,
    C32List64All,
    C32DupList64,
}

public class TargetedSendBenchmarks
{
    private TargetedSendFixture _fixture = null!;

    [ParamsAllValues]
    public Shape Shape { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        var connectionCount = Shape switch
        {
            Shape.NoConnections512 => 0,
            Shape.Small4List2 => 4,
            Shape.C128List256Miss or Shape.C128Array256Miss => 128,
            _ => 32,
        };
        var ids = Enumerable.Range(0, connectionCount).Select(index => $"c{index:D4}").ToArray();
        var targetSize = Shape switch
        {
            Shape.NoConnections512 => 512,
            Shape.EmptyTargets => 0,
            Shape.Small4List2 => 2,
            Shape.Threshold16List => 16,
            Shape.Threshold17List => 17,
            Shape.C128List256Miss or Shape.C128Array256Miss => 256,
            _ => 64,
        };
        var values = Enumerable.Range(0, targetSize).Select(index => $"missing-{index:D4}").ToArray();
        if (Shape is Shape.Small4List2 or Shape.Threshold16List or Shape.Threshold17List)
        {
            values = ids[..targetSize];
        }
        else if (Shape is Shape.C32List64Sparse or Shape.C32Array64Sparse)
        {
            values[^1] = ids[0];
        }
        else if (Shape is Shape.C32List64All)
        {
            ids.CopyTo(values, 0);
        }
        else if (Shape is Shape.C32DupList64)
        {
            for (var index = 0; index < values.Length; index++)
            {
                values[index] = ids[index % 2];
            }
        }
        var expectedIds = new HashSet<string>(values, StringComparer.Ordinal);
        var expectedRecipients = ids.Where(expectedIds.Contains).ToArray();
        IReadOnlyList<string> targets = Shape switch
        {
            Shape.C32Array64Miss or Shape.C128Array256Miss or Shape.C32Array64Sparse or Shape.NoConnections512 => values,
            Shape.C32ReadOnly64Miss => new ReadOnlyCollection<string>(values.ToList()),
            _ => values.ToList(),
        };
        _fixture = new TargetedSendFixture(ids, targets, expectedRecipients, ["World"]);
        Send().GetAwaiter().GetResult();
        _fixture.Validate();
        Evidence.Write("setup-preflight", new { shape = Shape.ToString(), connectionCount, targetSize, actual = _fixture.Observe() });
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
