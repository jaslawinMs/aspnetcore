using System.Collections.ObjectModel;
using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public enum Shape
{
    NoConnections512,
    EmptyTargets,
    Small4List2,
    C32List64Miss,
    C32Array64Miss,
    C32ReadOnly64Miss,
    C128List256Miss,
    C128Array256Miss,
    C32List64Sparse,
    C32Array64Sparse,
    C32List64All,
    C32DupList64,
    C32SharedUserList64,
    C32NullUsersArray64,
}

public class UserSendBenchmarks
{
    private UserSendFixture _fixture = null!;

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
        var users = Enumerable.Range(0, connectionCount).Select(index => Shape switch
        {
            Shape.C32NullUsersArray64 => null,
            Shape.C32SharedUserList64 => $"user-{index / 2:D4}",
            _ => $"user-{index:D4}",
        }).ToArray();
        var targetSize = Shape switch
        {
            Shape.NoConnections512 => 512,
            Shape.EmptyTargets => 0,
            Shape.Small4List2 => 2,
            Shape.C128List256Miss or Shape.C128Array256Miss => 256,
            _ => 64,
        };
        var values = Enumerable.Range(0, targetSize).Select(index => $"missing-{index:D4}").ToArray();
        if (Shape is Shape.Small4List2)
        {
            values = ["user-0000", "user-0001"];
        }
        else if (Shape is Shape.C32List64Sparse or Shape.C32Array64Sparse or Shape.C32SharedUserList64)
        {
            values[^1] = "user-0000";
        }
        else if (Shape is Shape.C32List64All)
        {
            for (var index = 0; index < connectionCount; index++)
            {
                values[index] = $"user-{index:D4}";
            }
        }
        else if (Shape is Shape.C32DupList64)
        {
            for (var index = 0; index < values.Length; index++)
            {
                values[index] = $"user-{index % 2:D4}";
            }
        }
        var expectedUsers = new HashSet<string>(values, StringComparer.Ordinal);
        var expectedRecipients = ids.Where((_, index) => users[index] is { } user && expectedUsers.Contains(user)).ToArray();
        IReadOnlyList<string> targets = Shape switch
        {
            Shape.C32Array64Miss or Shape.C128Array256Miss or Shape.C32Array64Sparse
                or Shape.NoConnections512 or Shape.C32NullUsersArray64 => values,
            Shape.C32ReadOnly64Miss => new ReadOnlyCollection<string>(values.ToList()),
            _ => values.ToList(),
        };
        _fixture = new UserSendFixture(ids, users, targets, expectedRecipients, ["World"]);
        Send().GetAwaiter().GetResult();
        _fixture.Validate();
        Evidence.Write("setup-preflight", new
        {
            shape = Shape.ToString(), connectionCount, targetSize, actual = _fixture.Observe(),
        });
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
