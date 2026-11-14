using System.Collections.Concurrent;
using System.Diagnostics.Tracing;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;

if (args.Length != 2)
{
    throw new ArgumentException("Supply one immutable snapshot directory and its Map_Greeter_1 or Map_NoBind_Control case.");
}

var snapshot = Path.GetFullPath(args[0]);
var benchmarkPath = Path.Combine(snapshot, "AutoPerf.Benchmarks.dll");
var resolver = new AssemblyDependencyResolver(benchmarkPath);
AssemblyLoadContext.Default.Resolving += (context, name) =>
{
    var path = resolver.ResolveAssemblyToPath(name);
    return path is null ? null : context.LoadFromAssemblyPath(path);
};
using var listener = new DiListener();
var producerThread = Environment.CurrentManagedThreadId;
var benchmark = AssemblyLoadContext.Default.LoadFromAssemblyPath(benchmarkPath);
var type = benchmark.GetType("ServiceDescriptorStartupBenchmark", throwOnError: true)!;
var fixture = Activator.CreateInstance(type)!;
type.GetProperty("Case")!.SetValue(fixture, args[1]);
type.GetMethod("Setup")!.Invoke(fixture, null);
listener.MarkReturned();
var compilationObserved = false;
try
{
    await listener.BackgroundCompilation.WaitAsync(TimeSpan.FromSeconds(10));
    compilationObserved = true;
}
catch (TimeoutException)
{
    Console.WriteLine("Observation: no off-thread DI compilation event arrived in the bounded 10-second window.");
}
var events = listener.Events.ToArray();
var owner = Assembly.Load("Microsoft.AspNetCore.Grpc.JsonTranscoding");
if (Path.GetFullPath(owner.Location) != Path.Combine(snapshot, "Microsoft.AspNetCore.Grpc.JsonTranscoding.dll") ||
    events.Count(entry => entry.Name is "ServiceProviderBuilt") != 2 ||
    events.Count(entry => entry.Name is "ScopeDisposed") < 2 ||
    events.Any(entry => entry.Name is "ServiceRealizationFailed"))
{
    throw new InvalidOperationException("Actual immutable producer/DI provider lifecycle observation failed.");
}
Console.WriteLine("Producer audit " + JsonSerializer.Serialize(new
{
    Case = args[1],
    Snapshot = snapshot,
    OwnerPath = owner.Location,
    OwnerMvid = owner.ManifestModule.ModuleVersionId,
    ProducerThread = producerThread,
    OffThreadCompilationObserved = compilationObserved,
    ObservationWindowSeconds = 10,
    TimingMeasured = false,
    AllocationMeasured = false,
    FourthBenchmarkComparison = false,
    AttributionOfReportedAllocationDifferenceEstablished = false,
    Events = events
}));

sealed class DiListener : EventListener
{
    public ConcurrentQueue<DiEvent> Events { get; } = new();
    private readonly TaskCompletionSource _backgroundCompilation = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly int _ownerThread = Environment.CurrentManagedThreadId;
    private int _returned;
    private int _sequence;
    public Task BackgroundCompilation => _backgroundCompilation.Task;

    public void MarkReturned() => Volatile.Write(ref _returned, 1);

    protected override void OnEventSourceCreated(EventSource source)
    {
        if (source.Name == "Microsoft-Extensions-DependencyInjection")
        {
            EnableEvents(source, EventLevel.Verbose, EventKeywords.All);
        }
    }

    protected override void OnEventWritten(EventWrittenEventArgs data)
    {
        if (data.EventSource.Name != "Microsoft-Extensions-DependencyInjection")
        {
            return;
        }
        if (data.EventName is "ServiceProviderBuilt" or "ScopeDisposed" or "ExpressionTreeGenerated" or "DynamicMethodBuilt" or "ServiceRealizationFailed")
        {
            Events.Enqueue(new DiEvent(
                Interlocked.Increment(ref _sequence),
                data.EventName,
                Environment.CurrentManagedThreadId,
                Volatile.Read(ref _returned) != 0,
                data.PayloadNames?.ToArray() ?? [],
                data.Payload?.ToArray() ?? []));
        }
        if (data.EventName is "DynamicMethodBuilt" && Environment.CurrentManagedThreadId != _ownerThread)
        {
            _backgroundCompilation.TrySetResult();
        }
    }
}

sealed record DiEvent(int Sequence, string Name, int Thread, bool StartupReturned, string[] PayloadNames, object?[] Payload);
