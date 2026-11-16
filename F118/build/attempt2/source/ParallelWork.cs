namespace AutoPerf;

internal sealed class ParallelWork : IDisposable
{
    internal const int Workers = 12;
    internal const int CallsPerWorker = 64;
    private readonly Thread[] _threads = new Thread[Workers];
    private readonly Workload[] _workloads = new Workload[Workers];
    private readonly Barrier _start = new(Workers + 1);
    private readonly Barrier _end = new(Workers + 1);
    private readonly long[] _checksums = new long[Workers];
    private readonly Exception?[] _errors = new Exception?[Workers];
    private readonly int _length;
    private bool _stop;
    internal long[] Allocations { get; } = new long[Workers];
    internal object?[] InitialSettings { get; } = new object?[Workers];
    internal object?[] FinalSettings { get; } = new object?[Workers];

    internal ParallelWork(Spec spec)
    {
        _length = spec.Length;
        for (var index = 0; index < Workers; index++)
        {
            _workloads[index] = new Workload(spec, worker: true);
            _workloads[index].Verify();
        }
        for (var index = 0; index < Workers; index++)
        {
            var worker = index;
            _threads[index] = new Thread(() => Execute(worker)) { IsBackground = true, Name = "F118-worker-" + index };
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
                var before = GC.GetAllocatedBytesForCurrentThread();
                for (var call = 0; call < CallsPerWorker; call++)
                {
                    var length = _workloads[worker].ValueChecksum();
                    Evidence.Require(length == _length, "Every real concurrent attribute must contain its expected complete content.");
                    sum += length;
                }
                Allocations[worker] = GC.GetAllocatedBytesForCurrentThread() - before;
                _checksums[worker] = sum;
            }
            catch (Exception error)
            {
                _errors[worker] = error;
            }
            Wait(_end);
        }
        FinalSettings[worker] = new { worker, managedThread = Environment.CurrentManagedThreadId, settings = SettingsPreservingEmitToolchain.ReadSettings() };
    }

    private static void Wait(Barrier barrier) => Evidence.Require(barrier.SignalAndWait(TimeSpan.FromSeconds(60)), "Explicit shared-machine worker gate timed out.");
    internal object Run()
    {
        Wait(_start);
        Wait(_end);
        if (_errors.Any(error => error is not null))
        {
            throw new AggregateException(_errors.OfType<Exception>());
        }
        Evidence.Require(_checksums.All(sum => sum == (long)_length * CallsPerWorker), "Concurrent producer checksum differs.");

        return this;
    }

    internal object Verify()
    {
        Run();

        return new { workers = Workers, callsPerWorker = CallsPerWorker, totalAttributeCalls = Workers * CallsPerWorker,
            contentLengthPerCall = _length, checksum = _checksums.Sum(), expectedChecksum = (long)_length * Workers * CallsPerWorker };
    }

    public void Dispose()
    {
        _stop = true;
        Wait(_start);
        foreach (var thread in _threads)
        {
            Evidence.Require(thread.Join(TimeSpan.FromSeconds(60)), "Owned diagnostic worker did not stop.");
        }
        foreach (var workload in _workloads)
        {
            workload.Dispose();
        }
        _start.Dispose();
        _end.Dispose();
    }
}
