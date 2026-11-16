using System.Diagnostics;
using Microsoft.AspNetCore.Connections;

namespace AutoPerf;

internal sealed class ParallelWork : IDisposable
{
    internal const int Workers = 12;
    internal const int CallsPerWorker = 512;
    [ThreadStatic] private static object? s_escape;
    private readonly Thread[] _threads = new Thread[Workers];
    private readonly DefaultConnectionContext[] _contexts = new DefaultConnectionContext[Workers];
    private readonly Barrier _start = new(Workers + 1);
    private readonly Barrier _end = new(Workers + 1);
    private readonly long[] _checksums = new long[Workers];
    private readonly Exception?[] _errors = new Exception?[Workers];
    private readonly bool[] _valid = new bool[Workers];
    private readonly int[] _ports;
    private bool _stop;
    internal long[] Allocations { get; } = new long[Workers];
    internal object?[] InitialSettings { get; } = new object?[Workers];
    internal object?[] FinalSettings { get; } = new object?[Workers];
    internal long ExpectedChecksum { get; }
    internal bool Valid => _valid.All(value => value);

    internal ParallelWork(int[] ports)
    {
        _ports = Enumerable.Range(0, Workers).Select(index => ports[index % ports.Length]).ToArray();
        ExpectedChecksum = _ports.Sum(port => (long)port * CallsPerWorker);
        for (var index = 0; index < Workers; index++)
        {
            var worker = index;
            _contexts[index] = Workload.Context(_ports[index]);
            _threads[index] = new Thread(() => Execute(worker)) { IsBackground = true, Name = "F116-worker-" + index };
            _threads[index].Start();
        }
    }

    private void Execute(int worker)
    {
        InitialSettings[worker] = new { worker, managedThread = Environment.CurrentManagedThreadId, settings = SettingsPreservingEmitToolchain.ReadSettings() };
        while (true)
        {
            Wait(_start);
            if (_stop)
            {
                break;
            }
            try
            {
                long sum = 0;
                var valid = true;
                var before = GC.GetAllocatedBytesForCurrentThread();
                for (var call = 0; call < CallsPerWorker; call++)
                {
                    var tags = new TagList();
                    Bindings.Kestrel.ContextTags(ref tags, _contexts[worker]);
                    s_escape = tags[1].Value;
                    valid &= tags.Count == 4 && tags[1].Key == "server.port" && s_escape is int port && port == _ports[worker];
                    sum += (int)s_escape!;
                }
                Allocations[worker] = GC.GetAllocatedBytesForCurrentThread() - before;
                _checksums[worker] = sum;
                _valid[worker] = valid;
            }
            catch (Exception error)
            {
                _errors[worker] = error;
            }
            Wait(_end);
        }
        FinalSettings[worker] = new { worker, managedThread = Environment.CurrentManagedThreadId, settings = SettingsPreservingEmitToolchain.ReadSettings() };
    }

    private static void Wait(Barrier barrier)
    {
        Evidence.Require(barrier.SignalAndWait(TimeSpan.FromSeconds(60)), "Explicit shared-machine worker gate timed out.");
    }

    internal long Run()
    {
        Wait(_start);
        Wait(_end);
        if (_errors.Any(error => error is not null))
        {
            throw new AggregateException(_errors.OfType<Exception>());
        }
        Evidence.Require(Valid, "Every actual parallel endpoint-tag call must observe its own port.");

        return _checksums.Sum();
    }

    internal object Contract() => new
    {
        workers = Workers, callsPerWorker = CallsPerWorker, totalEndpointCalls = Workers * CallsPerWorker,
        portsByWorker = _ports, checksum = _checksums.Sum(), expectedChecksum = ExpectedChecksum, everyPortReadValid = Valid
    };

    public void Dispose()
    {
        _stop = true;
        Wait(_start);
        foreach (var thread in _threads)
        {
            Evidence.Require(thread.Join(TimeSpan.FromSeconds(60)), "Owned diagnostic worker did not stop.");
        }
        foreach (var context in _contexts)
        {
            context.DisposeAsync().GetAwaiter().GetResult();
        }
        _start.Dispose();
        _end.Dispose();
    }
}
