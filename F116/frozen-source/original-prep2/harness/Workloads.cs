using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Net;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Connections.Features;
using Microsoft.AspNetCore.Http.Features;

namespace AutoPerf;

internal enum Kind { Getter, Tags, SignalRList, Queue, Parallel }
internal sealed record Spec(string Label, Kind Kind, int[] PortIndices, bool Ipv6 = false, bool Fallback = false, bool Override = false, bool Enabled = true);
internal sealed record TagValue(string Key, object? Value, string? ValueType);
internal sealed record Snapshot(string Event, TagValue[] Tags, int? Value = null, string? ValueType = null);

internal static class Cases
{
    internal static readonly Spec[] All =
    [
        new("GetFirst", Kind.Getter, [0]), new("GetSecond", Kind.Getter, [1]), new("GetThird", Kind.Getter, [2]),
        new("GetMix2", Kind.Getter, [0, 1]), new("GetMix4", Kind.Getter, [0, 1, 2, 3]),
        new("TagsFirst", Kind.Tags, [0]), new("TagsSecond", Kind.Tags, [1]), new("TagsThird", Kind.Tags, [2]),
        new("TagsMix2", Kind.Tags, [0, 1]), new("TagsIPv6", Kind.Tags, [1], Ipv6: true),
        new("TagsFallback", Kind.Tags, [1], Fallback: true), new("TagsOverride", Kind.Tags, [1], Override: true),
        new("ListFirst", Kind.SignalRList, [0]), new("ListSecond", Kind.SignalRList, [1]),
        new("ListThird", Kind.SignalRList, [2]), new("ListMix2", Kind.SignalRList, [0, 1]),
        new("QueueFirst", Kind.Queue, [0]), new("QueueSecond", Kind.Queue, [1]), new("QueueMix2", Kind.Queue, [0, 1]),
        new("QueueMany", Kind.Queue, [0, 1, 2, 3]), new("QueueOff", Kind.Queue, [1], Enabled: false),
        new("ParallelFirst", Kind.Parallel, [0]), new("ParallelMix2", Kind.Parallel, [0, 1]), new("ParallelMiss", Kind.Parallel, [2, 3])
    ];
}

internal sealed class Workload : IDisposable
{
    private readonly Spec _spec;
    private readonly int[] _ports;
    private readonly DefaultConnectionContext[] _contexts;
    private List<KeyValuePair<string, object?>> _list = new(8);
    private readonly List<Snapshot> _snapshots = [];
    private readonly LocalMeterFactory? _factory;
    private readonly MeterListener? _listener;
    private readonly object? _metrics;
    private readonly object[] _metricContexts = [];
    private TagList _tags;
    private object? _escape;
    private bool _capture;
    private long _received;
    private long _balance;
    internal ParallelWork? Parallel { get; }
    internal object Input { get; }

    internal Workload(Spec spec, int[] ports)
    {
        _spec = spec;
        _ports = spec.PortIndices.Select(index => ports[index]).ToArray();
        _contexts = _ports.Select(port =>
        {
            var context = Context(spec.Override ? ports[0] : port, spec.Ipv6);
            if (spec.Fallback)
            {
                context.Features.Set<IConnectionEndPointFeature>(null);
            }
            if (spec.Override)
            {
                context.Features.Set<IConnectionEndPointFeature>(new EndpointFeature { LocalEndPoint = new IPEndPoint(IPAddress.Loopback, port) });
            }

            return context;
        }).ToArray();
        if (spec.Kind == Kind.Queue)
        {
            _factory = new LocalMeterFactory();
            _listener = new MeterListener
            {
                InstrumentPublished = (instrument, listener) =>
                {
                    if (spec.Enabled && ReferenceEquals(instrument.Meter.Scope, _factory) && instrument.Name == "kestrel.queued_requests")
                    {
                        listener.EnableMeasurementEvents(instrument);
                    }
                }
            };
            _listener.SetMeasurementEventCallback<long>(Measurement);
            _listener.Start();
            _metrics = Bindings.CreateMetrics(_factory);
            _metricContexts = _contexts.Select(context => Bindings.CreateContext(_metrics, context)).ToArray();
            Evidence.Require(_metricContexts.All(context => (bool)Bindings.MetricsContextType.GetProperty("QueuedRequestsCounterEnabled")!.GetValue(context)! == spec.Enabled),
                "Only real MeterListener enablement and real CreateContext may establish metric flags.");
        }
        if (spec.Kind == Kind.Parallel)
        {
            Parallel = new ParallelWork(_ports);
        }
        Input = new
        {
            spec.Label, kind = spec.Kind.ToString(), ports = _ports, spec.Ipv6, spec.Fallback, spec.Override, spec.Enabled,
            owner = spec.Kind == Kind.SignalRList ? Bindings.SignalR.Assembly.GetName().Name : Bindings.Kestrel.Assembly.GetName().Name,
            unit = spec.Kind == Kind.Parallel ? "one coordinated12-worker batch,512 endpoint-tag calls per worker" :
                spec.Kind == Kind.Queue ? $"one prepared batch of{_ports.Length} streams,2 real metric emissions per enabled stream" :
                $"one prepared batch of{_ports.Length} actual helper calls",
            endpointReads = spec.Kind == Kind.Parallel ? ParallelWork.Workers * ParallelWork.CallsPerWorker :
                spec.Kind == Kind.Queue ? (spec.Enabled ? 2 * _ports.Length : 0) : _ports.Length,
            fullNetworkOrHubThroughput = false
        };
    }

    internal static DefaultConnectionContext Context(int port, bool ipv6 = false)
    {
        var address = ipv6 ? IPAddress.IPv6Loopback : IPAddress.Loopback;
        _ = address.ToString();

        return new DefaultConnectionContext("autoperf-f116") { LocalEndPoint = new IPEndPoint(address, port) };
    }

    internal long Run()
    {
        if (Parallel is not null)
        {
            return Parallel.Run();
        }
        long result = 0;
        _received = 0;
        _balance = 0;
        for (var index = 0; index < _contexts.Length; index++)
        {
            switch (_spec.Kind)
            {
                case Kind.Getter:
                    _escape = Bindings.Kestrel.Get(_ports[index]);
                    result += (int)_escape;
                    if (_capture)
                    {
                        _snapshots.Add(new("get", [], (int)_escape, _escape.GetType().FullName));
                    }
                    break;
                case Kind.Tags:
                    _tags = default;
                    Bindings.Kestrel.ContextTags(ref _tags, _contexts[index]);
                    _escape = _tags[1].Value;
                    result += (int)_escape!;
                    if (_capture)
                    {
                        _snapshots.Add(new("tags", Values(_tags)));
                    }
                    break;
                case Kind.SignalRList:
                    _list.Clear();
                    AddRpcTags(_list);
                    Bindings.SignalR.FeatureTags(ref _list, _contexts[index].Features);
                    _escape = _list[4].Value;
                    result += (int)_escape!;
                    if (_capture)
                    {
                        _snapshots.Add(new("signalr-list", Values(_list)));
                    }
                    break;
                case Kind.Queue:
                    Bindings.QueueStart(_metrics!, _metricContexts[index], "2");
                    Bindings.QueueStop(_metrics!, _metricContexts[index], "2");
                    break;
                default:
                    throw new InvalidOperationException("Unknown explicit workload kind.");
            }
        }

        return _spec.Kind == Kind.Queue ? _received : result;
    }

    private void Measurement(Instrument instrument, long measurement, ReadOnlySpan<KeyValuePair<string, object?>> tags, object? state)
    {
        _received++;
        _balance += measurement;
        foreach (var tag in tags)
        {
            if (tag.Key == "server.port")
            {
                _escape = tag.Value;
            }
        }
        if (_capture)
        {
            Evidence.Require(instrument.Name == "kestrel.queued_requests" && ReferenceEquals(instrument.Meter.Scope, _factory),
                "Only actual scoped queued-request instrument emissions may be observed.");
            _snapshots.Add(new(measurement == 1 ? "queue-start" : measurement == -1 ? "queue-stop" : throw new InvalidOperationException("Wrong metric delta."), Values(tags.ToArray())));
        }
    }

    internal object Verify()
    {
        _snapshots.Clear();
        _capture = true;
        var value = Run();
        _capture = false;
        if (Parallel is not null)
        {
            var actual = Parallel.Contract();
            Evidence.Require(value == Parallel.ExpectedChecksum && Parallel.Valid, "Every worker must read its own actual endpoint port on every producer call.");

            return actual;
        }
        var expected = new List<Snapshot>();
        foreach (var port in _ports)
        {
            var endpointTags = EndpointTags(_spec.Ipv6 ? "::1" : "127.0.0.1", port, _spec.Ipv6 ? "ipv6" : "ipv4", "tcp");
            switch (_spec.Kind)
            {
                case Kind.Getter:
                    expected.Add(new("get", [], port, typeof(int).FullName));
                    break;
                case Kind.Tags:
                    expected.Add(new("tags", endpointTags));
                    break;
                case Kind.SignalRList:
                    expected.Add(new("signalr-list", [.. RpcTags(), .. endpointTags]));
                    break;
                case Kind.Queue when _spec.Enabled:
                    TagValue[] metricTags = [.. endpointTags, new("network.protocol.name", "http", typeof(string).FullName), new("network.protocol.version", "2", typeof(string).FullName)];
                    expected.Add(new("queue-start", metricTags));
                    expected.Add(new("queue-stop", metricTags));
                    break;
            }
        }
        var expectedValue = _spec.Kind == Kind.Queue ? (_spec.Enabled ? 2 * _ports.Length : 0) : _ports.Sum(port => (long)port);
        Evidence.Require(value == expectedValue && _balance == 0 && Evidence.Compact(_snapshots) == Evidence.Compact(expected),
            "Exact ordered values/types/protocol and real emission counts must match independent contract:" + _spec.Label);

        return new { value, balancedMetricDeltas = _balance, snapshots = _snapshots.ToArray() };
    }

    internal static TagValue[] Values(IEnumerable<KeyValuePair<string, object?>> tags) =>
        tags.Select(tag => new TagValue(tag.Key, tag.Value, tag.Value?.GetType().FullName)).ToArray();

    internal static TagValue[] EndpointTags(string address, int port, string family, string transport) =>
    [
        new("server.address", address, typeof(string).FullName), new("server.port", port, typeof(int).FullName),
        new("network.type", family, typeof(string).FullName), new("network.transport", transport, typeof(string).FullName)
    ];

    private static TagValue[] RpcTags() =>
    [
        new("rpc.system", "signalr", typeof(string).FullName), new("rpc.service", "AutoPerfHub", typeof(string).FullName),
        new("rpc.method", "Echo", typeof(string).FullName)
    ];

    private static void AddRpcTags(List<KeyValuePair<string, object?>> tags)
    {
        tags.Add(new("rpc.system", "signalr"));
        tags.Add(new("rpc.service", "AutoPerfHub"));
        tags.Add(new("rpc.method", "Echo"));
    }

    public void Dispose()
    {
        Parallel?.Dispose();
        _listener?.Dispose();
        _factory?.Dispose();
        foreach (var context in _contexts)
        {
            context.DisposeAsync().GetAwaiter().GetResult();
        }
    }
}

internal sealed class EndpointFeature : IConnectionEndPointFeature
{
    public EndPoint? LocalEndPoint { get; set; }
    public EndPoint? RemoteEndPoint { get; set; }
}
