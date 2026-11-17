using System.Buffers;
using System.Collections;
using System.IO.Pipelines;
using System.Reflection;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Connections.Features;
using Microsoft.AspNetCore.Http.Features;

namespace AutoPerf;

internal sealed class ProtocolFixture : IAsyncDisposable
{
    private const BindingFlags Flags = BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;
    private readonly TaskCompletionSource _exit = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly List<object> _clients = [];
    private readonly List<ConnectionContext> _streams = [];
    private object _inMemory = null!;
    private object _connection = null!;
    private IWebTransportSession _session = null!;
    private Task<ConnectionContext?> _pendingAccept = null!;
    private Action _close = null!;

    internal IReadOnlyList<ConnectionContext> Streams => _streams;

    internal static async Task<ProtocolFixture> CreateAsync(int streams)
    {
        var fixture = new ProtocolFixture();
        var assembly = Assembly.Load("InMemory.FunctionalTests");
        var existingTest = Activator.CreateInstance(RequiredType(assembly, "Microsoft.AspNetCore.Server.Kestrel.Core.Tests.WebTransportSessionTests"))!;
        var timeoutHandler = Get(Get(existingTest, "_mockTimeoutHandler"), "Object");
        var services = Activator.CreateInstance(RequiredType(assembly, "Microsoft.AspNetCore.InternalTesting.TestServiceContext"))!;
        Set(services, "Scheduler", PipeScheduler.Inline);
        Set(Get(services, "ServerOptions"), "EnableWebTransportAndH3Datagrams", true);
        fixture._inMemory = Activator.CreateInstance(RequiredType(assembly, "Microsoft.AspNetCore.InternalTesting.Http3InMemory"),
            services, Get(services, "FakeTimeProvider"), timeoutHandler, Get(services, "LoggerFactory"))!;
        var utilities = RequiredType(assembly, "Microsoft.AspNetCore.Server.Kestrel.Core.Tests.WebTransportTestUtilities");
        fixture._session = (IWebTransportSession)await AwaitResultAsync(RequiredMethod(utilities, "GenerateSession", 3)
            .Invoke(null, [fixture._inMemory, fixture._exit, null])!);
        fixture._connection = Get(fixture._inMemory, "Connection");
        fixture._close = RequiredMethod(fixture._session.GetType(), "OnClientConnectionClosed", 0).CreateDelegate<Action>(fixture._session);
        Evidence.Require((int)Get(fixture._connection, "WebTransportSessionCount") == 1, "Real HTTP/3 session must be registered.");
        var type = RequiredType(fixture._session.GetType().Assembly, "Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http3.Http3StreamType");
        var streamType = Convert.ToInt64(Enum.Parse(type, "WebTransportUnidirectional"));
        for (var index = 0; index < streams; index++)
        {
            var client = await AwaitResultAsync(RequiredMethod(utilities, "CreateUnidirectionalStream", 3)
                .Invoke(null, [fixture._inMemory, streamType, fixture._session.SessionId])!);
            fixture._clients.Add(client);
            var stream = await fixture._session.AcceptStreamAsync().AsTask().WaitAsync(Evidence.Timeout);
            Evidence.Require(stream is not null, "Actual stream must pass protocol association and AcceptStreamAsync.");
            fixture._streams.Add(stream!);
            var direction = (IStreamDirectionFeature)stream!.Features[typeof(IStreamDirectionFeature)]!;
            Evidence.Require(direction.CanRead && !direction.CanWrite, "Actual client unidirectional stream direction differs.");
        }
        Evidence.Require(fixture.OpenStreamCount == streams, "Every real associated stream must be in the actual owner dictionary.");
        fixture._pendingAccept = fixture._session.AcceptStreamAsync().AsTask();
        Evidence.Require(!fixture._pendingAccept.IsCompleted, "Nearest pending-accept precondition must be real and empty.");

        return fixture;
    }

    private int OpenStreamCount => (int)Get(Get(_session, "_openStreams"), "Count");

    internal void Close() => _close();
    internal void Abort() => _session.Abort(0x102);

    internal async Task EndConnectInputAsync()
    {
        var running = (IDictionary)Get(_inMemory, "_runningStreams");
        var request = running[_session.SessionId] ?? throw new InvalidOperationException("Actual CONNECT client stream missing.");
        var pair = Get(request, "Pair");
        var application = (IDuplexPipe)Get(pair, "Application");
        await application.Output.CompleteAsync();
        await _pendingAccept.WaitAsync(Evidence.Timeout);
    }

    internal async Task OpenOutputAsync()
    {
        var stream = await _session.OpenUnidirectionalStreamAsync().AsTask().WaitAsync(Evidence.Timeout);
        Evidence.Require(stream is not null, "Actual output stream missing.");
        _streams.Add(stream!);
        var direction = (IStreamDirectionFeature)stream!.Features[typeof(IStreamDirectionFeature)]!;
        Evidence.Require(!direction.CanRead && direction.CanWrite && OpenStreamCount == 1, "Actual output stream/dictionary invariant differs.");
        var queue = Get(Get(_inMemory, "MultiplexedConnectionContext"), "ToClientAcceptQueue");
        var client = await AwaitResultAsync(RequiredMethod(Get(queue, "Reader").GetType(), "ReadAsync", 1)
            .Invoke(Get(queue, "Reader"), [CancellationToken.None])!);
        _clients.Add(client);
        var application = (IDuplexPipe)Get(Get(client, "Pair"), "Application");
        var result = await application.Input.ReadAsync().AsTask().WaitAsync(Evidence.Timeout);
        Evidence.Require(_session.SessionId == 0 && result.Buffer.ToArray().SequenceEqual(new byte[] { 0x40, 0x54, 0x00 }),
            "Actual session output wire header differs.");
        application.Input.AdvanceTo(result.Buffer.End);
    }

    internal async Task AssertClosedAsync()
    {
        Evidence.Require(await _pendingAccept.WaitAsync(Evidence.Timeout) is null && OpenStreamCount == 0 &&
            (int)Get(_connection, "WebTransportSessionCount") == 0, "Owner queue,stream dictionary and connection registry must be closed.");
        Evidence.Require(await _session.AcceptStreamAsync() is null && await _session.OpenUnidirectionalStreamAsync() is null, "Closed session must reject further stream activity.");
        foreach (var stream in _streams)
        {
            var direction = (IStreamDirectionFeature)stream.Features[typeof(IStreamDirectionFeature)]!;
            Evidence.Require(!direction.CanRead && !direction.CanWrite, "Every accepted stream must already be closed.");
            if (stream.Transport.Input.GetType().Name == "CompletionPipeReader" && (bool)Get(stream, "_canRead"))
            {
                Evidence.Require((bool)Get(stream.Transport.Input, "IsCompleted"), "Readable owner pipe must already be completed.");
            }
            if (stream.Transport.Output.GetType().Name == "CompletionPipeWriter" && (bool)Get(stream, "_canWrite"))
            {
                Evidence.Require((bool)Get(stream.Transport.Output, "IsCompleted"), "Writable owner pipe must already be completed.");
            }
        }
    }

    internal object Snapshot() => new
    {
        openStreams = OpenStreamCount,
        registeredSessions = (int)Get(_connection, "WebTransportSessionCount"),
        pendingAcceptCompleted = _pendingAccept.IsCompleted,
        streams = _streams.Select(stream => new
        {
            concreteType = stream.GetType().FullName,
            canRead = ((IStreamDirectionFeature)stream.Features[typeof(IStreamDirectionFeature)]!).CanRead,
            canWrite = ((IStreamDirectionFeature)stream.Features[typeof(IStreamDirectionFeature)]!).CanWrite,
            connectionClosedCanBeCanceled = stream.ConnectionClosed.CanBeCanceled,
            inputType = stream.Transport.Input.GetType().AssemblyQualifiedName,
            outputType = stream.Transport.Output.GetType().AssemblyQualifiedName,
            inputCompleted = (bool)Get(stream.Transport.Input, "IsCompleted"),
            outputCompleted = (bool)Get(stream.Transport.Output, "IsCompleted")
        }).ToArray()
    };

    public async ValueTask DisposeAsync()
    {
        _close();
        _exit.TrySetResult();
        var clients = ((IDictionary)Get(_inMemory, "_runningStreams")).Values.Cast<object>()
            .Concat(_clients).Append(Get(_inMemory, "_inboundControlStream")).Distinct().ToArray();
        foreach (var client in clients)
        {
            var application = (IDuplexPipe)Get(Get(client, "Pair"), "Application");
            await application.Output.CompleteAsync();
            await application.Input.CompleteAsync();
        }
        ((MultiplexedConnectionContext)Get(_inMemory, "MultiplexedConnectionContext")).Abort();
        await ((Task)Get(_inMemory, "_connectionTask")).WaitAsync(Evidence.Timeout);
        ((IDisposable)Get(_inMemory, "_memoryPool")).Dispose();
    }

    private static Type RequiredType(Assembly assembly, string name) => assembly.GetType(name, throwOnError: true)!;

    private static MethodInfo RequiredMethod(Type type, string name, int argumentCount)
    {
        for (var current = type; current is not null; current = current.BaseType)
        {
            var methods = current.GetMethods(Flags).Where(method => method.Name == name && method.GetParameters().Length == argumentCount).ToArray();
            if (methods.Length == 1)
            {
                return methods[0];
            }
        }

        throw new MissingMethodException(type.FullName, name);
    }

    private static object Get(object instance, string name)
    {
        for (var type = instance.GetType(); type is not null; type = type.BaseType)
        {
            if (type.GetProperty(name, Flags) is { } property)
            {
                return property.GetValue(instance) ?? throw new InvalidOperationException("Required member is null:" + name);
            }
            if (type.GetField(name, Flags) is { } field)
            {
                return field.GetValue(instance) ?? throw new InvalidOperationException("Required field is null:" + name);
            }
        }

        throw new MissingMemberException(instance.GetType().FullName, name);
    }

    private static void Set(object instance, string name, object value)
    {
        for (var type = instance.GetType(); type is not null; type = type.BaseType)
        {
            if (type.GetProperty(name, Flags) is { } property)
            {
                property.SetValue(instance, value);

                return;
            }
            if (type.GetField(name, Flags) is { } field)
            {
                field.SetValue(instance, value);

                return;
            }
        }

        throw new MissingMemberException(instance.GetType().FullName, name);
    }

    private static async Task<object> AwaitResultAsync(object value)
    {
        var task = value is Task existing ? existing : (Task)RequiredMethod(value.GetType(), "AsTask", 0).Invoke(value, null)!;
        await task.WaitAsync(Evidence.Timeout);

        return Get(task, "Result");
    }
}
