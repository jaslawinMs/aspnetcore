using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Connections.Features;
using Microsoft.AspNetCore.Http.Features;

namespace AutoPerf;

internal static class Controls
{
    internal static object EndpointContracts(int[] ports)
    {
        var rows = new List<object>();
        foreach (var owner in Bindings.Owners)
        {
            void Check(string name, BaseConnectionContext context, TagValue[] expected)
            {
                var tags = new TagList { { "sentinel", "keep" } };
                owner.ContextTags(ref tags, context);
                var actual = Workload.Values(tags);
                TagValue[] all = [new("sentinel", "keep", typeof(string).FullName), .. expected];
                Evidence.Require(Evidence.Compact(actual) == Evidence.Compact(all), "Exact concrete endpoint contract failed:" + name);
                rows.Add(new { owner = owner.Assembly.GetName().Name, name, actual });
            }
            using var lifetime = new ContextLifetime(Workload.Context(ports[1]));
            var context = lifetime.Context;
            context.LocalEndPoint = null;
            Check("null-endpoint", context, []);
            context.LocalEndPoint = new UnixDomainSocketEndPoint("autoperf-f116.sock");
            Check("unix", context, [new("server.address", "autoperf-f116.sock", typeof(string).FullName), new("network.transport", "unix", typeof(string).FullName)]);
            context.LocalEndPoint = new NamedPipeEndPoint("autoperf-f116");
            Check("named-pipe", context, [new("server.address", @"\\.\pipe\autoperf-f116", typeof(string).FullName), new("network.transport", "pipe", typeof(string).FullName)]);
            context.LocalEndPoint = new OtherEndpoint();
            Check("other-endpoint", context, [new("server.address", "autoperf-other", typeof(string).FullName), new("network.transport", "Unspecified", typeof(string).FullName)]);
            context.LocalEndPoint = new IPEndPoint(IPAddress.Loopback, ports[1]);
            context.Features.Set<IConnectionEndPointFeature>(null);
            Check("missing-feature-context-fallback", context, Workload.EndpointTags("127.0.0.1", ports[1], "ipv4", "tcp"));
            var list = new List<KeyValuePair<string, object?>> { new("sentinel", "keep") };
            owner.FeatureTags(ref list, context.Features);
            Evidence.Require(list.Count == 1 && list[0].Key == "sentinel" && list[0].Value is "keep", "Feature-only overload must not invent a fallback endpoint.");
            rows.Add(new { owner = owner.Assembly.GetName().Name, name = "missing-feature-feature-overload", actual = Workload.Values(list) });
            context.Features.Set<IConnectionEndPointFeature>(new EndpointFeature());
            Check("null-feature-context-fallback", context, Workload.EndpointTags("127.0.0.1", ports[1], "ipv4", "tcp"));
            var multiplexed = new PreparedMultiplexedContext { LocalEndPoint = new IPEndPoint(IPAddress.Loopback, ports[1]) };
            Check("prepared-multiplexed-fallback", multiplexed, Workload.EndpointTags("127.0.0.1", ports[1], "ipv4", "udp"));
            multiplexed.Features.Set<IConnectionEndPointFeature>(new EndpointFeature { LocalEndPoint = new IPEndPoint(IPAddress.IPv6Loopback, ports[2]) });
            Check("prepared-multiplexed-feature-override", multiplexed, Workload.EndpointTags("::1", ports[2], "ipv6", "udp"));
        }

        return new { rows, preparedMultiplexedIsNotActualQuic = true, namedPipeAndUnixAreMetadataControlsNotTransportRuns = true };
    }

    internal static object LateListener(int port)
    {
        using var lifetime = new ContextLifetime(Workload.Context(port));
        using var factory = new LocalMeterFactory();
        var metrics = Bindings.CreateMetrics(factory);
        var beforeListener = Bindings.CreateContext(metrics, lifetime.Context);
        var observations = new List<object>();
        using var listener = new MeterListener
        {
            InstrumentPublished = (instrument, current) =>
            {
                if (ReferenceEquals(instrument.Meter.Scope, factory) && instrument.Name == "kestrel.queued_requests")
                {
                    current.EnableMeasurementEvents(instrument);
                }
            }
        };
        listener.SetMeasurementEventCallback<long>((instrument, measurement, tags, state) =>
            observations.Add(new { measurement, tags = Workload.Values(tags.ToArray()) }));
        listener.Start();
        Bindings.QueueStart(metrics, beforeListener, "2");
        Bindings.QueueStop(metrics, beforeListener, "2");
        Evidence.Require(observations.Count == 0, "A real late listener must not override flags captured by earlier CreateContext.");
        var afterListener = Bindings.CreateContext(metrics, lifetime.Context);
        Bindings.QueueStart(metrics, afterListener, "2");
        Bindings.QueueStop(metrics, afterListener, "2");
        TagValue[] expectedTags = [.. Workload.EndpointTags("127.0.0.1", port, "ipv4", "tcp"),
            new("network.protocol.name", "http", typeof(string).FullName), new("network.protocol.version", "2", typeof(string).FullName)];
        object[] expected = [new { measurement = 1L, tags = expectedTags }, new { measurement = -1L, tags = expectedTags }];
        Evidence.Require(Evidence.Compact(observations) == Evidence.Compact(expected), "A real newly created context must emit exact typed endpoint/protocol tags and balanced deltas.");

        return new { earlierContextEmissions = 0, newlyCreatedContextEmissions = observations, privateFlagsWritten = false };
    }

    internal static object ColdRace(int[] ports)
    {
        Evidence.Require(Bindings.Owners.All(owner => owner.CacheFields.All(field => field.GetValue(null) is null)),
            "A fresh child process with untouched caches is required for the cold race;never reset private fields.");
        var before = Bindings.Owners.Select(owner => owner.CacheSnapshot()).ToArray();
        using var gate = new Barrier(ParallelWork.Workers + 1);
        var threads = new Thread[ParallelWork.Workers];
        var values = new object?[ParallelWork.Workers];
        var allocated = new long[ParallelWork.Workers];
        var initial = new object?[ParallelWork.Workers];
        var final = new object?[ParallelWork.Workers];
        var errors = new Exception?[ParallelWork.Workers];
        var contexts = Enumerable.Range(0, ParallelWork.Workers).Select(index => Workload.Context(ports[index % ports.Length])).ToArray();
        for (var index = 0; index < threads.Length; index++)
        {
            var worker = index;
            threads[index] = new Thread(() =>
            {
                try
                {
                    initial[worker] = SettingsPreservingEmitToolchain.ReadSettings();
                    Evidence.Require(gate.SignalAndWait(TimeSpan.FromSeconds(60)), "Cold producer gate timed out.");
                    var start = GC.GetAllocatedBytesForCurrentThread();
                    var tags = new TagList();
                    Bindings.Kestrel.ContextTags(ref tags, contexts[worker]);
                    values[worker] = tags[1].Value;
                    allocated[worker] = GC.GetAllocatedBytesForCurrentThread() - start;
                    Evidence.Require(values[worker] is int value && value == ports[worker % ports.Length], "A startup race returned the wrong actual endpoint port.");
                    final[worker] = SettingsPreservingEmitToolchain.ReadSettings();
                    Evidence.Require(Evidence.Compact(initial[worker]) == Evidence.Compact(final[worker]), "Cold worker settings changed.");
                }
                catch (Exception error)
                {
                    errors[worker] = error;
                }
            }) { IsBackground = true, Name = "F116-cold-" + index };
            threads[index].Start();
        }
        Evidence.Require(gate.SignalAndWait(TimeSpan.FromSeconds(60)), "Cold controller gate timed out.");
        foreach (var thread in threads)
        {
            Evidence.Require(thread.Join(TimeSpan.FromSeconds(60)), "Owned cold worker did not stop.");
        }
        foreach (var context in contexts)
        {
            context.DisposeAsync().GetAwaiter().GetResult();
        }
        if (errors.Any(error => error is not null))
        {
            throw new AggregateException(errors.OfType<Exception>());
        }
        var cold = Bindings.Owners.Select(owner => owner.CacheSnapshot()).ToArray();
        Bindings.Prime(ports);
        var warm = Bindings.Owners.Select(owner => owner.CacheSnapshot()).ToArray();
        foreach (var owner in Bindings.Owners)
        {
            var retained = owner.CacheFields.Select(field => field.GetValue(null)).OfType<int>().ToArray();
            var count = Evidence.Variant == "original" ? 1 : 2;
            Evidence.Require(owner.CacheFields.Length == count && retained.Length == count && retained.Distinct().Count() == count &&
                retained.All(ports.Contains), "Warmed retained cache slots must be bounded,correct and distinct.");
        }

        return new
        {
            workers = threads.Length, before, cold, warm, values, allocatedBytesByWorker = allocated, initialSettings = initial, finalSettings = final,
            privateCacheWritesByHarness = false, coldCalls = threads.Length,
            limitation = "One bounded simultaneous cold observation per fresh child,not proof that all startup schedules were explored. Original cold first-slot overwrites are not treated as a wrong-value bug. Cold allocation includes JIT/first producer effects;no standalone cold timing speedup is claimed."
        };
    }

    private sealed class OtherEndpoint : EndPoint
    {
        public override AddressFamily AddressFamily => AddressFamily.Unspecified;
        public override string ToString() => "autoperf-other";
    }

    private sealed class PreparedMultiplexedContext : MultiplexedConnectionContext
    {
        public override string ConnectionId { get; set; } = "prepared-multiplexed";
        public override IFeatureCollection Features { get; } = new FeatureCollection();
        public override IDictionary<object, object?> Items { get; set; } = new Dictionary<object, object?>();
        public override void Abort() => throw new NotSupportedException("No transport execution in this metadata control.");
        public override void Abort(ConnectionAbortedException abortReason) => throw new NotSupportedException("No transport execution in this metadata control.");
        public override ValueTask<ConnectionContext?> AcceptAsync(CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public override ValueTask<ConnectionContext> ConnectAsync(IFeatureCollection? features = null, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
