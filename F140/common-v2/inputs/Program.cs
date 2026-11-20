using System.Diagnostics;
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
        if (args.Length is not (4 or 5))
        {
            throw new ArgumentException("Expected mode, role, actual native image directory, output JSON and measurement-only pair index.", nameof(args));
        }

        var role = args[1];
        var image = Path.GetFullPath(args[2]);
        AssemblyLoadContext.Default.Resolving += (_, name) =>
        {
            var file = Path.Combine(image, $"{name.Name}.dll");
            return File.Exists(file) ? AssemblyLoadContext.Default.LoadFromAssemblyPath(file) : null;
        };
        var tests = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(image, "Microsoft.AspNetCore.SignalR.Client.Tests.dll"));
        switch (args[0])
        {
            case "functional" when args.Length is 4:
                await Contracts.RunAsync(role, tests, Path.GetFullPath(args[3]));
                break;
            case "measure" when args.Length is 5 && int.TryParse(args[4], out var pairIndex) && pairIndex is >= 0 and < 7:
                await Contracts.MeasureAsync(role, tests, Path.GetFullPath(args[3]), pairIndex);
                break;
            default:
                throw new ArgumentException("Unknown mode or invalid argument count/pair index.", nameof(args));
        }

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
        var lifetime = await CollectibleTypeAsync(tests, token);
        passed.Add("ActualStartedConnection.CollectibleArgumentTypeClassifiedBeforeSerializationAndUnloads");
        foreach (var item in CreateWireCases())
        {
            await using var peer = await Peer.StartAsync(tests, token);
            await SendAndReadAsync(peer, item, 1, token);
            passed.Add($"PublicSend.ExactRawNativeFrame.{item.Name}");
        }
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
            actualCollectibleLifetime = lifetime,
            actualCommonFixtureVersion = 2,
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

    private static async Task<object> CollectibleTypeAsync(Assembly tests, CancellationToken token)
    {
        await using var peer = await Peer.StartAsync(tests, token);
        var references = ClassifyCollectibleType(peer.Hub);
        var rounds = 0;
        while ((references.Context.IsAlive || references.Type.IsAlive) && rounds < 10)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
            rounds++;
        }
        Require(!references.Context.IsAlive && !references.Type.IsAlive, "Actual collectible argument context/type unloads while its real HubConnection remains alive.");
        GC.KeepAlive(peer.Hub);

        return new
        {
            actualOwnerProducer = "HubConnection.PackageStreamingParams with its own already-started connection state, before protocol serialization",
            actualArgumentCreatedFromCollectibleContext = true,
            actualNoPrivateCacheEntrySeeded = true,
            actualClassifierCachePresent = references.CachePresent,
            actualEntryObservedOnlyAfterRealProducer = references.EntryObserved,
            actualContextAndTypeCollected = true,
            actualRealConnectionKeptAliveThroughCollection = true,
            actualGcRounds = rounds,
            actualSerializationBypassedOnlyToAvoidUnrelatedSerializerMetadataRoots = true
        };
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static (WeakReference Context, WeakReference Type, bool CachePresent, bool EntryObserved) ClassifyCollectibleType(HubConnection hub)
    {
        var context = new AssemblyLoadContext("AutoPerf.F140.CollectiblePayload", isCollectible: true);
        var assembly = context.LoadFromAssemblyPath(typeof(Payload).Assembly.Location);
        var type = assembly.GetType(typeof(Payload).FullName!, throwOnError: true)!;
        var payload = Activator.CreateInstance(type, [7, "collectible"])!;
        Require(AssemblyLoadContext.GetLoadContext(type.Assembly) == context && type.Assembly.IsCollectible, "Real separate collectible assembly/type, not a fabricated Type key.");
        Require(Type.GetTypeCode(payload.GetType()) is TypeCode.Object, "Actual argument reaches the classifier guard.");
        var state = typeof(HubConnection).GetField("_state", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(hub)!;
        var connectionState = state.GetType().GetProperty("CurrentConnectionStateUnsynchronized")!.GetValue(state)!;
        object?[] originalArguments = [payload];
        object?[] invocation = [connectionState, originalArguments, null];
        var producer = typeof(HubConnection).GetMethod("PackageStreamingParams", BindingFlags.Instance | BindingFlags.NonPublic)!;
        Require(producer.Invoke(hub, invocation) is null && invocation[2] is null, "Real producer classifies the collectible ordinary payload as nonstream.");
        Require(ReferenceEquals(invocation[1], originalArguments) && ReferenceEquals(originalArguments[0], payload), "Real producer preserves the ordinary argument array and identity.");
        var cacheField = typeof(HubConnection).GetField("_streamingTypeCache", BindingFlags.Static | BindingFlags.NonPublic);
        var observed = false;
        if (cacheField is not null)
        {
            var cache = (ConditionalWeakTable<Type, StrongBox<bool>>)cacheField.GetValue(null)!;
            observed = cache.TryGetValue(type, out var value);
            Require(observed && value is not null && !value.Value, "Actual producer, not fixture seeding, created the expected Boolean cache entry.");
        }
        var references = (new WeakReference(context, trackResurrection: true), new WeakReference(type, trackResurrection: true), cacheField is not null, observed);
        context.Unload();

        return references;
    }

    private static WireCase[] CreateWireCases()
    {
        var cases = new[]
        {
            new WireCase("primary", "Objects",
                [Guid.Parse("00112233-4455-6677-8899-aabbccddeeff"), new Payload(7, "payload"), new List<int> { 3, 5, 8 }, new object()],
                "{\"type\":1,\"target\":\"Objects\",\"arguments\":[\"00112233-4455-6677-8899-aabbccddeeff\",{\"count\":7,\"text\":\"payload\"},[3,5,8],{}]}"),
            new WireCase("primitive-control", "Primitives",
                [null, 17, "text", true, SampleEnum.One, new DateTime(2024, 1, 2, 3, 4, 5, DateTimeKind.Utc), 1.5m],
                "{\"type\":1,\"target\":\"Primitives\",\"arguments\":[null,17,\"text\",true,1,\"2024-01-02T03:04:05Z\",1.5]}"),
            new WireCase("no-interface", "PlainObjects", [new PlainPayload(7, "payload"), new object()],
                "{\"type\":1,\"target\":\"PlainObjects\",\"arguments\":[{\"count\":7,\"text\":\"payload\"},{}]}")
        };
        Require(cases[0].Arguments.All(item => Type.GetTypeCode(item!.GetType()) is TypeCode.Object), "Frozen primary really reaches the object classifier.");
        Require(cases[1].Arguments.All(item => item is null || Type.GetTypeCode(item.GetType()) is not TypeCode.Object), "Frozen primitive control bypasses the classifier.");
        Require(cases[2].Arguments.All(item => Type.GetTypeCode(item!.GetType()) is TypeCode.Object && item.GetType().GetInterfaces().Length is 0), "Nonregression dataset genuinely has no implemented interfaces.");

        return cases;
    }

    private static async Task<long> SendAndReadAsync(Peer peer, WireCase item, int operations, CancellationToken token)
    {
        long characters = 0;
        for (var index = 0; index < operations; index++)
        {
            await peer.Hub.SendCoreAsync(item.Target, item.Arguments, token);
            var frame = await peer.ReadRawAsync(token);
            Require(string.Equals(frame, item.Expected, StringComparison.Ordinal), "Entire actual native wire frame differs for the fixed selected dataset.");
            characters += frame.Length;
        }
        Require(characters == (long)operations * item.Expected.Length, "Every completed public send produced the exact full native frame.");

        return characters;
    }

    internal static async Task MeasureAsync(string role, Assembly tests, string output, int pairIndex)
    {
        Require(Environment.GetEnvironmentVariable("AUTOPERF_F140_GATE_ADMITTED") is "1", "Only the reviewed globally exclusive driver may invoke measurements.");
        Require(Environment.GetEnvironmentVariable("DOTNET_TieredCompilation") == "0", "Frozen optimized non-tiered benchmark process policy.");
        Require(Environment.GetEnvironmentVariable("AUTOPERF_IDENTITY_DIR") is null, "No identity hashing or output during measurements.");
        using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(3));
        var cases = CreateWireCases();
        var observations = new List<object>();
        for (var index = 0; index < cases.Length; index++)
        {
            var item = cases[(index + pairIndex) % cases.Length];
            await using var peer = await Peer.StartAsync(tests, timeout.Token);
            await SendAndReadAsync(peer, item, 128, timeout.Token);
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
            var allocatedBefore = GC.GetTotalAllocatedBytes(precise: true);
            var started = Stopwatch.GetTimestamp();
            var characters = await SendAndReadAsync(peer, item, 8192, timeout.Token);
            var elapsedTicks = Stopwatch.GetTimestamp() - started;
            var allocatedBytes = GC.GetTotalAllocatedBytes(precise: true) - allocatedBefore;
            observations.Add(new
            {
                name = item.Name,
                actualOperations = 8192,
                actualWarmupOperations = 128,
                actualAllocatedBytes = allocatedBytes,
                actualElapsedTimestampTicks = elapsedTicks,
                actualStopwatchFrequency = Stopwatch.Frequency,
                actualFrameCharacters = characters
            });
        }
        File.WriteAllText(output, JsonSerializer.Serialize(new
        {
            role,
            pairIndex,
            observations,
            actualPid = Environment.ProcessId,
            actualMachine = Environment.MachineName,
            actualFramework = RuntimeInformation.FrameworkDescription,
            actualSourceBuiltClient = typeof(HubConnection).Assembly.Location,
            actualClientMvid = typeof(HubConnection).Assembly.ManifestModule.ModuleVersionId,
            actualTestProducerMvid = tests.ManifestModule.ModuleVersionId,
            actualCommonFixtureMvid = typeof(Program).Assembly.ManifestModule.ModuleVersionId,
            actualTieredCompilationEnvironment = Environment.GetEnvironmentVariable("DOTNET_TieredCompilation"),
            actualServerGc = System.Runtime.GCSettings.IsServerGC,
            actualIsolatedDedicatedMachineClaimed = false,
            actualNormalPriorityAtSampleTimeClaimed = false,
            actualBoundary = "Public client, source-built native test transport, exact raw framed output; not socket/server/browser throughput",
            actualMeasurementFramework = "Custom GC.GetTotalAllocatedBytes(precise:true) and Stopwatch, not BenchmarkDotNet"
        }, new JsonSerializerOptions { WriteIndented = true }));
    }

    internal static void Require([DoesNotReturnIf(false)] bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    public sealed record Payload(int Count, string Text);
    private sealed record WireCase(string Name, string Target, object?[] Arguments, string Expected);
    private sealed class PlainPayload(int count, string text)
    {
        public int Count { get; } = count;
        public string Text { get; } = text;
    }
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
        private readonly Func<Task<string?>> _readRaw;
        private readonly MethodInfo _dispose;

        private Peer(object connection, HubConnection hub)
        {
            _connection = connection;
            Hub = hub;
            var type = connection.GetType();
            _read = type.GetMethod("ReadSentTextMessageAsync")!.CreateDelegate<Func<bool, Task<string?>>>(connection);
            _readRaw = type.GetMethod("ReadSentTextMessageAsyncInner", BindingFlags.Instance | BindingFlags.NonPublic)!.CreateDelegate<Func<Task<string?>>>(connection);
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

        public async Task<string> ReadRawAsync(CancellationToken token)
        {
            var text = await _readRaw().WaitAsync(token);
            Require(text is not null, "Actual native raw transport did not close before the expected frame.");

            return text;
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
