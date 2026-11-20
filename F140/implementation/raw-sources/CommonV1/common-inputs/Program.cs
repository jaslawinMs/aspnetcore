using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.SignalR.Client;

namespace AutoPerf.SignalR;

internal static class Program
{
    public static async Task<int> Main(string[] args)
    {
        if (args.Length is not 3)
        {
            throw new ArgumentException("Expected role, actual native image directory and output JSON.");
        }

        var role = args[0];
        var image = Path.GetFullPath(args[1]);
        AssemblyLoadContext.Default.Resolving += (_, name) =>
        {
            var file = Path.Combine(image, $"{name.Name}.dll");
            return File.Exists(file) ? AssemblyLoadContext.Default.LoadFromAssemblyPath(file) : null;
        };
        var tests = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(image, "Microsoft.AspNetCore.SignalR.Client.Tests.dll"));
        await Contracts.RunAsync(role, tests, Path.GetFullPath(args[2]));

        return 0;
    }
}

internal static class Contracts
{
    public static async Task RunAsync(string role, Assembly tests, string output)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(90));
        var token = timeout.Token;
        var passed = new List<string>();
        await PrimitivesAsync(tests, token);
        passed.Add("PublicSend.PrimitiveNullStringEnumDateTimeDecimalControl");
        await ObjectsAsync(tests, token);
        passed.Add("PublicSend.RepeatedGuidPocoListAndObjectRetainExactArguments");
        var streamIds = await AsyncEnumerableAsync(tests, token);
        passed.Add("PublicSend.IAsyncEnumerableTwoUploadsExactIdsValuesCompletionAndDisposal");
        await ChannelAsync(tests, token);
        passed.Add("PublicSend.ChannelReaderExactItemsAndCompletionControl");
        await CancellationAsync(tests, token);
        passed.Add("PublicSend.IAsyncEnumerableCancellationCompletesAndDisposesProducer");
        StartupHook.Snapshot("functional-complete");
        File.WriteAllText(output, JsonSerializer.Serialize(new
        {
            role,
            passed,
            actualDynamicCodeSupported = RuntimeFeature.IsDynamicCodeSupported,
            actualNativeAotExecuted = false,
            actualFramework = RuntimeInformation.FrameworkDescription,
            actualSourceBuiltClient = typeof(HubConnection).Assembly.Location,
            actualSourceBuiltTestProducer = tests.Location,
            actualClientMvid = typeof(HubConnection).Assembly.ManifestModule.ModuleVersionId,
            actualTestProducerMvid = tests.ManifestModule.ModuleVersionId,
            actualStreamIds = streamIds,
            actualAllChecksUntimed = true,
            actualBoundary = "Actual native test factory/transport and public HubConnection startup/send/upload; no extracted ReflectionHelper, injected core callback or full socket/server.",
            actualF141NativeAotOrDisabledDynamicCodeProducerVerified = false
        }, new JsonSerializerOptions { WriteIndented = true }));
    }

    private static async Task PrimitivesAsync(Assembly tests, CancellationToken token)
    {
        await using var peer = await Peer.StartAsync(tests, token);
        object?[] arguments = [null, 17, "text", true, SampleEnum.One, new DateTime(2024, 1, 2, 3, 4, 5, DateTimeKind.Utc), 1.5m];
        Require(arguments.Where(item => item is not null).All(item => Type.GetTypeCode(item!.GetType()) is not TypeCode.Object), "Primitive guard preconditions.");
        await peer.Hub.SendCoreAsync("Primitives", arguments, token);
        using var message = await peer.ReadAsync(token);
        Invocation(message.RootElement, "Primitives");
        Require(message.RootElement.GetProperty("arguments").GetRawText() == "[null,17,\"text\",true,1,\"2024-01-02T03:04:05Z\",1.5]", "Exact primitive wire values.");
    }

    private static async Task ObjectsAsync(Assembly tests, CancellationToken token)
    {
        await using var peer = await Peer.StartAsync(tests, token);
        object?[] arguments = [Guid.Parse("00112233-4455-6677-8899-aabbccddeeff"), new Payload(7, "payload"), new List<int> { 3, 5, 8 }, new object()];
        Require(arguments.All(item => Type.GetTypeCode(item!.GetType()) is TypeCode.Object), "Nonstream object guard preconditions.");
        for (var index = 0; index < 3; index++)
        {
            await peer.Hub.SendCoreAsync("Objects", arguments, token);
            using var message = await peer.ReadAsync(token);
            Invocation(message.RootElement, "Objects");
            Require(message.RootElement.GetProperty("arguments").GetRawText() == "[\"00112233-4455-6677-8899-aabbccddeeff\",{\"count\":7,\"text\":\"payload\"},[3,5,8],{}]", "Exact repeated object wire values.");
        }
    }

    private static async Task<string[]> AsyncEnumerableAsync(Assembly tests, CancellationToken token)
    {
        await using var peer = await Peer.StartAsync(tests, token);
        var streamIds = new HashSet<string>(StringComparer.Ordinal);
        for (var upload = 0; upload < 2; upload++)
        {
            var sequence = new RecordingSequence();
            await peer.Hub.SendCoreAsync("AsyncUpload", [sequence], token);
            var id = await peer.StreamIdAsync("AsyncUpload", token);
            Require(streamIds.Add(id), "Each actual upload stream has a distinct ID.");
            await sequence.Started.Task.WaitAsync(token);
            foreach (var value in new[] { 42, -7, 0 })
            {
                await sequence.Values.Writer.WriteAsync(value, token);
                using var item = await peer.ReadAsync(token);
                StreamFrame(item.RootElement, id, 2);
                Require(item.RootElement.GetProperty("item").GetInt32() == value, "Exact IAsyncEnumerable item.");
            }
            Require(sequence.Values.Writer.TryComplete(), "Complete the actual async producer.");
            using var completion = await peer.ReadAsync(token);
            StreamFrame(completion.RootElement, id, 3);
            Require(!completion.RootElement.TryGetProperty("error", out _), "Successful async upload has no error.");
            await sequence.Disposed.Task.WaitAsync(token);
            Require(sequence.EnumerationCount == 1, "One actual enumerator per upload.");
        }

        return streamIds.ToArray();
    }

    private static async Task ChannelAsync(Assembly tests, CancellationToken token)
    {
        await using var peer = await Peer.StartAsync(tests, token);
        var channel = Channel.CreateUnbounded<int>();
        await peer.Hub.SendCoreAsync("ChannelUpload", [channel.Reader], token);
        var id = await peer.StreamIdAsync("ChannelUpload", token);
        foreach (var value in new[] { 3, 1, -2 })
        {
            await channel.Writer.WriteAsync(value, token);
            using var item = await peer.ReadAsync(token);
            StreamFrame(item.RootElement, id, 2);
            Require(item.RootElement.GetProperty("item").GetInt32() == value, "Exact ChannelReader item.");
        }
        Require(channel.Writer.TryComplete(), "Complete the actual channel producer.");
        using var completion = await peer.ReadAsync(token);
        StreamFrame(completion.RootElement, id, 3);
        Require(!completion.RootElement.TryGetProperty("error", out _), "Successful channel upload has no error.");
        await channel.Reader.Completion.WaitAsync(token);
    }

    private static async Task CancellationAsync(Assembly tests, CancellationToken token)
    {
        await using var peer = await Peer.StartAsync(tests, token);
        using var cancel = new CancellationTokenSource();
        var sequence = new RecordingSequence();
        await peer.Hub.SendCoreAsync("CanceledUpload", [sequence], cancel.Token);
        var id = await peer.StreamIdAsync("CanceledUpload", token);
        await sequence.Started.Task.WaitAsync(token);
        await sequence.Values.Writer.WriteAsync(29, token);
        using (var item = await peer.ReadAsync(token))
        {
            StreamFrame(item.RootElement, id, 2);
            Require(item.RootElement.GetProperty("item").GetInt32() == 29, "Observe an item before cancellation.");
        }
        cancel.Cancel();
        using var completion = await peer.ReadAsync(token);
        StreamFrame(completion.RootElement, id, 3);
        Require(completion.RootElement.GetProperty("error").GetString()!.EndsWith("canceled by client.", StringComparison.Ordinal), "Actual public cancellation error.");
        await sequence.Disposed.Task.WaitAsync(token);
        Require(sequence.EnumerationCount == 1, "Canceled upload enumerated exactly once.");
        Require(sequence.Values.Writer.TryComplete(), "Close the canceled private producer channel.");
    }

    private static void Invocation(JsonElement message, string target)
    {
        Require(message.GetProperty("type").GetInt32() == 1 && message.GetProperty("target").GetString() == target, "Actual public invocation target/type.");
        Require(!message.TryGetProperty("invocationId", out _), "Send is a nonblocking invocation.");
        Require(!message.TryGetProperty("streamIds", out _), "Nonstream payload has no stream IDs.");
    }

    private static void StreamFrame(JsonElement frame, string id, int type)
    {
        Require(frame.GetProperty("type").GetInt32() == type && frame.GetProperty("invocationId").GetString() == id, "Frame kind and actual upload ID.");
    }

    internal static void Require([DoesNotReturnIf(false)] bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    public sealed record Payload(int Count, string Text);
    private enum SampleEnum { One = 1 }

    private sealed class RecordingSequence : IAsyncEnumerable<int>
    {
        public Channel<int> Values { get; } = Channel.CreateUnbounded<int>();
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Disposed { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public int EnumerationCount { get; private set; }

        public IAsyncEnumerator<int> GetAsyncEnumerator(CancellationToken cancellationToken = default)
        {
            EnumerationCount++;

            return Read(cancellationToken).GetAsyncEnumerator(cancellationToken);
        }

        private async IAsyncEnumerable<int> Read([EnumeratorCancellation] CancellationToken cancellationToken)
        {
            try
            {
                Started.SetResult();
                await foreach (var value in Values.Reader.ReadAllAsync(cancellationToken))
                {
                    yield return value;
                }
            }
            finally
            {
                Disposed.SetResult();
            }
        }
    }

    private sealed class Peer : IAsyncDisposable
    {
        private readonly object _connection;
        private readonly Func<bool, Task<string?>> _read;
        private readonly MethodInfo _dispose;

        private Peer(object connection, HubConnection hub)
        {
            _connection = connection;
            Hub = hub;
            var type = connection.GetType();
            _read = type.GetMethod("ReadSentTextMessageAsync")!.CreateDelegate<Func<bool, Task<string?>>>(connection);
            _dispose = type.GetMethod(nameof(IAsyncDisposable.DisposeAsync))!;
        }

        public HubConnection Hub { get; }

        public static async Task<Peer> StartAsync(Assembly tests, CancellationToken token)
        {
            var connectionType = tests.GetType("Microsoft.AspNetCore.SignalR.Client.Tests.TestConnection", throwOnError: true)!;
            var connection = Activator.CreateInstance(connectionType, [null, null, false, true, null])!;
            var factoryType = tests.GetType("Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests", throwOnError: true)!;
            var factory = factoryType.GetMethod("CreateHubConnection", BindingFlags.Static | BindingFlags.NonPublic)!;
            var hub = (HubConnection)factory.Invoke(null, [connection, null, null, null])!;
            hub.KeepAliveInterval = TimeSpan.FromHours(1);
            hub.ServerTimeout = TimeSpan.FromHours(1);
            var peer = new Peer(connection, hub);
            var start = hub.StartAsync(token);
            var handshake = (Task<string>)connectionType.GetMethod("ReadHandshakeAndSendResponseAsync")!.Invoke(connection, [0])!;
            Require(await handshake.WaitAsync(token) == "{\"protocol\":\"json\",\"version\":1}", "Actual native transport handshake and actual core response.");
            await start.WaitAsync(token);
            Require(hub.State is HubConnectionState.Connected, "Real public startup completed.");

            return peer;
        }

        public async Task<JsonDocument> ReadAsync(CancellationToken token)
        {
            var text = await _read(true).WaitAsync(token);
            Require(text is not null, "Actual transport did not close before the expected frame.");

            return JsonDocument.Parse(text);
        }

        public async Task<string> StreamIdAsync(string target, CancellationToken token)
        {
            using var message = await ReadAsync(token);
            var root = message.RootElement;
            Require(root.GetProperty("type").GetInt32() == 1 && root.GetProperty("target").GetString() == target, "Actual upload invocation target/type.");
            Require(root.GetProperty("arguments").GetArrayLength() == 0, "Stream removed from normal serialized arguments.");
            var ids = root.GetProperty("streamIds");
            Require(ids.GetArrayLength() == 1 && !string.IsNullOrEmpty(ids[0].GetString()), "Exactly one native-produced stream ID.");

            return ids[0].GetString()!;
        }

        public async ValueTask DisposeAsync()
        {
            await Hub.DisposeAsync();
            await (ValueTask)_dispose.Invoke(_connection, [])!;
        }
    }
}
