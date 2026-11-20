using System.Buffers;
using System.IO.Pipelines;
using System.Net;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Channels;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.SignalR.Protocol;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AutoPerf.SignalR.NativeUpload;

internal static class Program
{
    public static async Task<int> Main(string[] args)
    {
        Require(args.Length is 2 && args[0] == "Original37", "Expected pinned source role and output file.");
        Require(!RuntimeFeature.IsDynamicCodeSupported && !RuntimeFeature.IsDynamicCodeCompiled,
            "This probe requires actual NativeAOT, not a normal CoreCLR execution or a configuration-forced substitute.");
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(90));
        var token = timeout.Token;
        var passed = new List<string> { "NativeAot.DynamicCodeUnsupportedAndNotCompiled" };
        var sequences = new List<SequenceEvidence>();
        var peer = new Peer();
        try
        {
            await peer.StartAsync(token);
            passed.Add("PublicConnection.ActualJsonHandshakeAndStartedState");

            var ints = new RecordingSequence<int>([42, -7, 0]);
            await peer.Hub.SendCoreAsync("ClassIntUpload", [ints], token);
            await peer.ExpectUploadAsync("ClassIntUpload", ["42", "-7", "0"], token);
            await ints.Disposed.Task.WaitAsync(token);
            Require(ints.Enumerations == 1 && ints.Moves == 4 && ints.Disposals == 1,
                "The real value-type producer is enumerated once, advances through the end and is disposed once.");
            sequences.Add(new SequenceEvidence("class-int", ints.Enumerations, ints.Moves, ints.Disposals));
            passed.Add("PublicSend.IAsyncEnumerableIntExactFramesEnumeratedOnceDisposed");

            var lifetime = new IteratorLifetime();
            await peer.Hub.SendCoreAsync("CompilerIntUpload", [CompilerInts(lifetime)], token);
            await peer.ExpectUploadAsync("CompilerIntUpload", ["11", "13", "17"], token);
            await lifetime.Disposed.Task.WaitAsync(token);
            Require(lifetime.BodyEntries == 1 && lifetime.FinallyEntries == 1,
                "The compiler-generated value-type async iterator runs and disposes once.");
            sequences.Add(new SequenceEvidence("compiler-int-body-and-finally", lifetime.BodyEntries, 0, lifetime.FinallyEntries));
            passed.Add("PublicSend.CompilerAsyncIteratorIntExactFramesAndFinally");

            var strings = new RecordingSequence<string>(["alpha", "omega"]);
            await peer.Hub.SendCoreAsync("ReferenceControl", [strings], token);
            await peer.ExpectUploadAsync("ReferenceControl", ["\"alpha\"", "\"omega\""], token);
            await strings.Disposed.Task.WaitAsync(token);
            Require(strings.Enumerations == 1 && strings.Moves == 3 && strings.Disposals == 1,
                "The reference-type control retains its actual values and complete lifecycle.");
            sequences.Add(new SequenceEvidence("class-string-control", strings.Enumerations, strings.Moves, strings.Disposals));
            passed.Add("PublicSend.IAsyncEnumerableStringReferenceTypeControlExactFrames");

            var channel = Channel.CreateUnbounded<int>();
            Require(channel.Writer.TryWrite(3) && channel.Writer.TryWrite(1) && channel.Writer.TryWrite(-2) &&
                channel.Writer.TryComplete(), "Produce and complete the independent real channel control.");
            await peer.Hub.SendCoreAsync("ChannelControl", [channel.Reader], token);
            await peer.ExpectUploadAsync("ChannelControl", ["3", "1", "-2"], token);
            await channel.Reader.Completion.WaitAsync(token);
            passed.Add("PublicSend.ChannelReaderIntValueTypeDistinctReflectionControlExactFrames");
            await peer.Hub.StopAsync(token);
        }
        finally
        {
            await peer.DisposeAsync();
        }
        Require(peer.Context.Disposed && peer.Services.Disposed && peer.Factory.ConnectCalls == 1,
            "The actual connection and owned services close after one real public start.");
        passed.Add("PublicConnection.ActualTransportAndServiceProviderDisposed");
        var result = new ProbeReport
        {
            SourceRole = args[0],
            ActualProcessId = Environment.ProcessId,
            ActualExecutablePath = Environment.ProcessPath ?? throw new InvalidOperationException("Missing process path."),
            ActualFrameworkDescription = RuntimeInformation.FrameworkDescription,
            ActualCoreLibFullName = typeof(object).Assembly.FullName ?? throw new InvalidOperationException("Missing CoreLib identity."),
            ActualClientAssemblyFullName = typeof(HubConnection).Assembly.FullName ?? throw new InvalidOperationException("Missing client identity."),
            ActualDynamicCodeSupported = RuntimeFeature.IsDynamicCodeSupported,
            ActualDynamicCodeCompiled = RuntimeFeature.IsDynamicCodeCompiled,
            ActualNoPrivateReflectionOrInjectedCallbacks = true,
            ActualFunctionalProducerCountsNotHelperPerformanceCounters = true,
            ActualF141HelperCallPerReflectionEnumeratorIsSourceDerivedNotRuntimeCounted = true,
            Passed = passed,
            Frames = peer.Frames,
            Sequences = sequences
        };
        await File.WriteAllTextAsync(args[1], JsonSerializer.Serialize(result, ProbeJsonContext.Default.ProbeReport), token);
        return 0;
    }

    private static async IAsyncEnumerable<int> CompilerInts(IteratorLifetime lifetime,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        lifetime.BodyEntries++;
        try
        {
            foreach (var value in new[] { 11, 13, 17 })
            {
                await Task.Yield();
                cancellationToken.ThrowIfCancellationRequested();
                yield return value;
            }
        }
        finally
        {
            lifetime.FinallyEntries++;
            lifetime.Disposed.TrySetResult();
        }
    }

    internal static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}

internal sealed class Peer : IAsyncDisposable
{
    private readonly Pipe _toClient = new();
    private readonly Pipe _fromClient = new();
    private readonly HashSet<string> _streamIds = [];
    internal List<FrameEvidence> Frames { get; } = [];
    internal EmptyServices Services { get; } = new();
    internal ProbeConnection Context { get; }
    internal SingleConnectionFactory Factory { get; }
    internal HubConnection Hub { get; }

    internal Peer()
    {
        Context = new ProbeConnection(new Duplex(_toClient.Reader, _fromClient.Writer));
        Factory = new SingleConnectionFactory(Context);
        var options = new JsonHubProtocolOptions
        {
            PayloadSerializerOptions = new JsonSerializerOptions { TypeInfoResolver = ProbeJsonContext.Default }
        };
        Hub = new HubConnection(Factory, new JsonHubProtocol(Options.Create(options)),
            new IPEndPoint(IPAddress.Loopback, 0), Services, NullLoggerFactory.Instance)
        {
            KeepAliveInterval = TimeSpan.FromMinutes(2),
            ServerTimeout = TimeSpan.FromMinutes(2)
        };
    }

    internal async Task StartAsync(CancellationToken token)
    {
        var start = Hub.StartAsync(token);
        var handshake = await ReadRawAsync(token);
        Program.Require(handshake == "{\"protocol\":\"json\",\"version\":1}", "Exact real client handshake.");
        Frames.Add(new FrameEvidence("handshake", handshake));
        await _toClient.Writer.WriteAsync("{}\u001e"u8.ToArray(), token);
        await start.WaitAsync(token);
        Program.Require(Hub.State is HubConnectionState.Connected, "Real connection reaches Connected.");
    }

    internal async Task ExpectUploadAsync(string target, string[] items, CancellationToken token)
    {
        var invocation = await ReadNonPingAsync(token);
        using var document = JsonDocument.Parse(invocation);
        var ids = document.RootElement.GetProperty("streamIds");
        Program.Require(ids.GetArrayLength() == 1, "Exactly one actual upload ID.");
        var id = ids[0].GetString() ?? throw new InvalidOperationException("Missing actual stream ID.");
        Program.Require(id.Length > 0 && _streamIds.Add(id), "Each actual upload ID is nonempty and unique.");
        var expected = $"{{\"type\":1,\"target\":\"{target}\",\"arguments\":[],\"streamIds\":[\"{id}\"]}}";
        Program.Require(invocation == expected, "Exact entire invocation, empty arguments, target and actual unique upload ID.");
        Frames.Add(new FrameEvidence(target + ":invocation", invocation));
        foreach (var item in items)
        {
            var frame = await ReadNonPingAsync(token);
            Program.Require(frame == $"{{\"type\":2,\"invocationId\":\"{id}\",\"item\":{item}}}",
                "Exact entire item frame, actual ID and independently expected payload.");
            Frames.Add(new FrameEvidence(target + ":item", frame));
        }
        var completion = await ReadNonPingAsync(token);
        Program.Require(completion == $"{{\"type\":3,\"invocationId\":\"{id}\"}}",
            "Exact successful completion with the same actual ID and no error or result.");
        Frames.Add(new FrameEvidence(target + ":completion", completion));
    }

    private async Task<string> ReadNonPingAsync(CancellationToken token)
    {
        while (true)
        {
            var frame = await ReadRawAsync(token);
            if (frame == "{\"type\":6}")
            {
                Frames.Add(new FrameEvidence("verified-ping-control", frame));
                continue;
            }
            return frame;
        }
    }

    private async Task<string> ReadRawAsync(CancellationToken token)
    {
        while (true)
        {
            var read = await _fromClient.Reader.ReadAsync(token);
            var buffer = read.Buffer;
            if (buffer.PositionOf((byte)0x1e) is { } end)
            {
                var payload = buffer.Slice(0, end).ToArray();
                _fromClient.Reader.AdvanceTo(buffer.GetPosition(1, end));
                return Encoding.UTF8.GetString(payload);
            }
            _fromClient.Reader.AdvanceTo(buffer.Start, buffer.End);
            Program.Require(!read.IsCompleted, "Transport must not finish before an entire record separator-delimited frame.");
        }
    }

    public async ValueTask DisposeAsync()
    {
        await Hub.DisposeAsync();
        await _toClient.Writer.CompleteAsync();
        await _fromClient.Reader.CompleteAsync();
    }
}

internal sealed class Duplex(PipeReader input, PipeWriter output) : IDuplexPipe
{
    public PipeReader Input { get; } = input;
    public PipeWriter Output { get; } = output;
}

internal sealed class ProbeConnection(IDuplexPipe transport) : ConnectionContext
{
    public override string ConnectionId { get; set; } = "F141-real-in-memory-transport";
    public override IFeatureCollection Features { get; } = new FeatureCollection();
    public override IDictionary<object, object?> Items { get; set; } = new Dictionary<object, object?>();
    public override IDuplexPipe Transport { get; set; } = transport;
    internal bool Disposed { get; private set; }

    public override async ValueTask DisposeAsync()
    {
        Disposed = true;
        await Transport.Input.CompleteAsync();
        await Transport.Output.CompleteAsync();
    }
}

internal sealed class SingleConnectionFactory(ProbeConnection context) : IConnectionFactory
{
    internal int ConnectCalls { get; private set; }

    public ValueTask<ConnectionContext> ConnectAsync(EndPoint endpoint, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        ConnectCalls++;
        Program.Require(ConnectCalls == 1, "One actual factory connection without reconnect or network.");
        context.RemoteEndPoint = endpoint;
        return ValueTask.FromResult<ConnectionContext>(context);
    }
}

internal sealed class EmptyServices : IServiceProvider, IDisposable
{
    internal bool Disposed { get; private set; }
    public object? GetService(Type serviceType) => null;
    public void Dispose() => Disposed = true;
}

internal sealed class RecordingSequence<T>(T[] values) : IAsyncEnumerable<T>
{
    private readonly T[] _values = values;
    internal int Enumerations { get; private set; }
    internal int Moves { get; private set; }
    internal int Disposals { get; private set; }
    internal TaskCompletionSource Disposed { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken cancellationToken = default)
    {
        Enumerations++;
        return new Enumerator(this, cancellationToken);
    }

    private sealed class Enumerator(RecordingSequence<T> owner, CancellationToken token) : IAsyncEnumerator<T>
    {
        private int _index = -1;
        public T Current => owner._values[_index];

        public async ValueTask<bool> MoveNextAsync()
        {
            owner.Moves++;
            await Task.Yield();
            token.ThrowIfCancellationRequested();
            return ++_index < owner._values.Length;
        }

        public ValueTask DisposeAsync()
        {
            owner.Disposals++;
            owner.Disposed.TrySetResult();
            return default;
        }
    }
}

internal sealed class IteratorLifetime
{
    internal int BodyEntries { get; set; }
    internal int FinallyEntries { get; set; }
    internal TaskCompletionSource Disposed { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
}

internal sealed record FrameEvidence(string Scenario, string EntireFrame);
internal sealed record SequenceEvidence(string Scenario, int EnumerationsOrBodyEntries, int MoveNextCalls, int DisposalsOrFinallyEntries);

internal sealed class ProbeReport
{
    public required string SourceRole { get; init; }
    public required int ActualProcessId { get; init; }
    public required string ActualExecutablePath { get; init; }
    public required string ActualFrameworkDescription { get; init; }
    public required string ActualCoreLibFullName { get; init; }
    public required string ActualClientAssemblyFullName { get; init; }
    public required bool ActualDynamicCodeSupported { get; init; }
    public required bool ActualDynamicCodeCompiled { get; init; }
    public required bool ActualNoPrivateReflectionOrInjectedCallbacks { get; init; }
    public required bool ActualFunctionalProducerCountsNotHelperPerformanceCounters { get; init; }
    public required bool ActualF141HelperCallPerReflectionEnumeratorIsSourceDerivedNotRuntimeCounted { get; init; }
    public required List<string> Passed { get; init; }
    public required List<FrameEvidence> Frames { get; init; }
    public required List<SequenceEvidence> Sequences { get; init; }
}

[JsonSerializable(typeof(ProbeReport))]
[JsonSerializable(typeof(int))]
[JsonSerializable(typeof(string))]
internal sealed partial class ProbeJsonContext : JsonSerializerContext
{
}
