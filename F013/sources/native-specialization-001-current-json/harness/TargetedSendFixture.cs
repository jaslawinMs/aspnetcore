using System.IO.Pipelines;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Protocol;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

internal sealed class TargetedSendFixture : IAsyncDisposable
{
    private readonly DefaultConnectionContext[] _connections;
    private readonly HubConnectionContext[] _hubs;
    private readonly BoundedWriter[] _writers;
    private readonly HashSet<string> _expectedRecipients;
    private readonly IReadOnlyList<string> _targets;
    private readonly object?[] _arguments;
    private readonly bool _expectSingleRecipient;
    private long _calls;

    public TargetedSendFixture(string[] ids, IReadOnlyList<string> targets, string[] expectedRecipients,
        object?[] arguments, int groupMembers = 0, bool expectSingleRecipient = false)
    {
        _targets = targets;
        _expectedRecipients = new HashSet<string>(expectedRecipients, StringComparer.Ordinal);
        _arguments = arguments;
        _expectSingleRecipient = expectSingleRecipient;
        Manager = new DefaultHubLifetimeManager<Hub>(NullLogger<DefaultHubLifetimeManager<Hub>>.Instance);
        _connections = new DefaultConnectionContext[ids.Length];
        _hubs = new HubConnectionContext[ids.Length];
        _writers = new BoundedWriter[ids.Length];
        var protocol = new JsonHubProtocol();
        for (var index = 0; index < ids.Length; index++)
        {
            var writer = new BoundedWriter();
            var connection = new DefaultConnectionContext(ids[index])
            {
                Transport = new Transport(PipeReader.Create(Stream.Null, new StreamPipeReaderOptions(leaveOpen: true)), writer),
            };
            var hub = new HubConnectionContext(connection, new HubConnectionContextOptions
            {
                KeepAliveInterval = Timeout.InfiniteTimeSpan,
                ClientTimeoutInterval = Timeout.InfiniteTimeSpan,
            }, NullLoggerFactory.Instance)
            {
                Protocol = protocol,
            };
            _connections[index] = connection;
            _hubs[index] = hub;
            _writers[index] = writer;
            Manager.OnConnectedAsync(hub).GetAwaiter().GetResult();
            if (index < groupMembers)
            {
                Manager.AddToGroupAsync(ids[index], "group").GetAwaiter().GetResult();
            }
        }
    }

    public DefaultHubLifetimeManager<Hub> Manager { get; }
    public long Calls => _calls;

    public Task Send(CancellationToken cancellationToken = default)
    {
        _calls++;

        return Manager.SendConnectionsAsync(_targets, "Probe", _arguments, cancellationToken);
    }

    public void Validate(bool objectPayload = false)
    {
        Evidence.Require(_calls > 0, "The actual public send must have run.");
        for (var index = 0; index < _connections.Length; index++)
        {
            var expectedFrames = _expectedRecipients.Contains(_connections[index].ConnectionId) ? _calls : 0;
            var writer = _writers[index];
            Evidence.Require(writer.Frames == expectedFrames, "Unexpected delivery count for " + _connections[index].ConnectionId);
            Evidence.Require(!_hubs[index].ConnectionAborted.IsCancellationRequested && writer.Failure is null,
                "The real owner swallowed a transport/serialization error or aborted.");
            if (expectedFrames > 0)
            {
                ValidateFrame(writer.LastFrame, objectPayload);
                Evidence.Require(writer.TotalBytes == expectedFrames * writer.LastFrame.Length, "Unexpected byte accounting.");
            }
        }
    }

    public void ValidateSingleDelivery()
    {
        Evidence.Require(_expectSingleRecipient && _calls == 1 && _writers.Count(writer => writer.Frames > 0) == 1,
            "The live-list send must deliver to exactly one connection.");
        for (var index = 0; index < _writers.Length; index++)
        {
            var writer = _writers[index];
            Evidence.Require(writer.Frames is 0 or 1 && !_hubs[index].ConnectionAborted.IsCancellationRequested &&
                writer.Failure is null, "Unexpected live-list delivery, serialization or transport state.");
            if (writer.Frames == 1)
            {
                ValidateFrame(writer.LastFrame, objectPayload: true);
                Evidence.Require(writer.TotalBytes == writer.LastFrame.Length, "Unexpected live-list byte accounting.");
            }
        }
    }

    public object Observe() => new
    {
        calls = _calls,
        inputType = _targets.GetType().FullName,
        actualRecipients = _connections.Where((_, index) => _writers[index].Frames > 0).Select(item => item.ConnectionId).ToArray(),
        expectedRecipients = _expectSingleRecipient ? null : _expectedRecipients.Order(StringComparer.Ordinal).ToArray(),
        expectedRecipientCount = _expectSingleRecipient ? 1 : _expectedRecipients.Count,
        expectedRecipientIdentityPredetermined = !_expectSingleRecipient,
        connections = _connections.Select((item, index) => new
        {
            id = item.ConnectionId,
            frames = _writers[index].Frames,
            bytes = _writers[index].TotalBytes,
            lastFrame = Encoding.UTF8.GetString(_writers[index].LastFrame),
            aborted = _hubs[index].ConnectionAborted.IsCancellationRequested,
            boundedCapacity = _writers[index].Capacity,
        }).ToArray(),
    };

    public void Reset()
    {
        _calls = 0;
        foreach (var writer in _writers)
        {
            writer.Reset();
        }
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var hub in _hubs)
        {
            await Manager.OnDisconnectedAsync(hub);
        }
        foreach (var connection in _connections)
        {
            await connection.Transport.Input.CompleteAsync();
            await connection.Transport.Output.CompleteAsync();
            await connection.DisposeAsync();
        }
    }

    internal static void ValidateFrame(ReadOnlySpan<byte> bytes, bool objectPayload = false)
    {
        Evidence.Require(bytes.Length > 1 && bytes[^1] == 0x1e, "Actual SignalR JSON record separator missing.");
        using var document = JsonDocument.Parse(bytes[..^1].ToArray());
        var root = document.RootElement;
        Evidence.Require(root.GetProperty("type").GetInt32() == 1 && root.GetProperty("target").GetString() == "Probe",
            "Actual invocation envelope differs.");
        var arguments = root.GetProperty("arguments");
        Evidence.Require(arguments.GetArrayLength() == 1, "Actual argument count differs.");
        var value = objectPayload ? arguments[0].GetProperty("value") : arguments[0];
        Evidence.Require(value.GetString() == "World", "Actual transmitted argument differs.");
    }

    internal sealed class Transport(PipeReader input, PipeWriter output) : IDuplexPipe
    {
        public PipeReader Input { get; } = input;
        public PipeWriter Output { get; } = output;
    }

    private sealed class BoundedWriter : PipeWriter
    {
        private readonly byte[] _buffer = new byte[256];
        private int _advanced;
        private int _lastLength;

        public int Capacity => _buffer.Length;
        public long Frames { get; private set; }
        public long TotalBytes { get; private set; }
        public string? Failure { get; private set; }
        public ReadOnlySpan<byte> LastFrame => _buffer.AsSpan(0, _lastLength);

        public override Memory<byte> GetMemory(int sizeHint = 0)
        {
            if (sizeHint < 0 || sizeHint > _buffer.Length - _advanced)
            {
                Failure = "The bounded transport capacity was exceeded.";
                throw new InvalidOperationException(Failure);
            }

            return _buffer.AsMemory(_advanced);
        }

        public override Span<byte> GetSpan(int sizeHint = 0) => GetMemory(sizeHint).Span;

        public override void Advance(int bytes)
        {
            if (bytes < 0 || bytes > _buffer.Length - _advanced)
            {
                Failure = "Invalid bounded transport advance.";
                throw new InvalidOperationException(Failure);
            }
            _advanced += bytes;
        }

        public override ValueTask<FlushResult> FlushAsync(CancellationToken cancellationToken = default)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                return ValueTask.FromCanceled<FlushResult>(cancellationToken);
            }
            _lastLength = _advanced;
            Frames++;
            TotalBytes += _advanced;
            _advanced = 0;

            return default;
        }

        public override void CancelPendingFlush() => throw new InvalidOperationException("No pending synchronous flush exists.");
        public override void Complete(Exception? exception = null)
        {
            Evidence.Require(exception is null && _advanced == 0, "Unexpected transport completion state.");
        }

        public void Reset()
        {
            Evidence.Require(_advanced == 0 && Failure is null, "Cannot reset an invalid transport.");
            Frames = 0;
            TotalBytes = 0;
            _lastLength = 0;
        }
    }
}
