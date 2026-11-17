using System.Buffers;
using System.Collections;
using System.Collections.ObjectModel;
using System.IO.Pipelines;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Protocol;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

internal static class ContractProbes
{
    public static async Task<int> Run()
    {
        var checks = 0;
        async Task RunCase(string name, Func<Task<object>> probe)
        {
            var observation = await probe();
            Evidence.Write("producer", new { caseName = name, passed = true, observation });
            checks++;
        }
        await RunCase("BroadcastScopeCaseAndDuplicates", BroadcastScopeCaseAndDuplicates);
        await RunCase("EmptyConnectionStoreDoesNotReadInput", EmptyConnectionStoreDoesNotReadInput);
        await RunCase("AllExcludedDoesNotSerializeCanceledSend", AllExcludedDoesNotSerializeCanceledSend);
        await RunCase("JsonPayloadSerializedOnceForAllRecipients", JsonPayloadSerializedOnceForAllRecipients);
        foreach (var shape in new[] { "Array", "List", "ReadOnlyWrapper" })
        {
            await RunCase("Live" + shape + "MutationAtJsonGetter", () => MutationAtJsonGetter(shape, snapshotControl: false));
            await RunCase("SnapshotInputControl" + shape, () => MutationAtJsonGetter(shape, snapshotControl: true));
        }
        await RunCase("CustomCollectionContainsDispatch", () => CustomCollectionContainsDispatch(snapshotControl: false));
        await RunCase("SnapshotInputControlCustomDispatch", () => CustomCollectionContainsDispatch(snapshotControl: true));
        foreach (var dimensions in new[] { (Connections: 1, Excluded: 1), (Connections: 8, Excluded: 16), (Connections: 32, Excluded: 64) })
        {
            await RunCase($"RepeatedMissEnumerationC{dimensions.Connections}E{dimensions.Excluded}",
                () => RepeatedMissEnumeration(dimensions.Connections, dimensions.Excluded));
        }
        await RunCase("PendingWritesWaitForEveryPipe", () => ActualPipeWrites(cancel: false));
        await RunCase("PendingWritesCancelThroughActualPipes", () => ActualPipeWrites(cancel: true));

        return checks;
    }

    private static async Task<object> BroadcastScopeCaseAndDuplicates()
    {
        string[] ids = ["connection", "CONNECTION", "Connection", "outside"];
        await using var fixture = new BroadcastSendFixture(ids, ["connection", "connection", "missing"],
            ["CONNECTION", "Connection", "outside"], ["World"], groupMembers: 3);
        await fixture.Send();
        fixture.Validate();

        return fixture.Observe();
    }

    private static async Task<object> EmptyConnectionStoreDoesNotReadInput()
    {
        var excluded = new UnreadableList();
        var payload = new ObservedPayload(throwIfRead: true);
        await using var fixture = new BroadcastSendFixture([], excluded, [], [payload]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(excluded.Reads == 0 && payload.Reads == 0, "An empty connection store touched exclusions or serialized arguments.");

        return new { inputReads = excluded.Reads, argumentGetterReads = payload.Reads, actual = fixture.Observe() };
    }

    private static async Task<object> AllExcludedDoesNotSerializeCanceledSend()
    {
        var payload = new ObservedPayload(throwIfRead: true);
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await using var fixture = new BroadcastSendFixture(["c0000", "c0001"], ["c0000", "c0001"],
            [], [payload]);
        var send = fixture.Send(cancellation.Token);
        Evidence.Require(send.IsCompletedSuccessfully, "An entirely excluded send should not initiate canceled writes.");
        await send;
        fixture.Validate(objectPayload: true);
        Evidence.Require(payload.Reads == 0, "An entirely excluded broadcast serialized the argument.");

        return new { argumentGetterReads = payload.Reads, canceledToken = true, actual = fixture.Observe() };
    }

    private static async Task<object> JsonPayloadSerializedOnceForAllRecipients()
    {
        string[] ids = ["c0000", "c0001", "c0002"];
        var payload = new ObservedPayload();
        await using var fixture = new BroadcastSendFixture(ids, [], ids, [payload]);
        await fixture.Send();
        fixture.Validate(objectPayload: true);
        Evidence.Require(payload.Reads == 1, "The real JSON serialization cache did not serialize once.");

        return new { argumentGetterReads = payload.Reads, actual = fixture.Observe() };
    }

    private static async Task<object> MutationAtJsonGetter(string shape, bool snapshotControl)
    {
        var ids = Enumerable.Range(0, 8).Select(index => $"c{index:D4}").ToArray();
        var initial = Enumerable.Range(0, 16).Select(index => $"missing-{index:D4}").ToArray();
        IList<string> backing = shape == "Array" ? initial : initial.ToList();
        IReadOnlyList<string> original = shape switch
        {
            "Array" => (string[])backing,
            "List" => (List<string>)backing,
            "ReadOnlyWrapper" => new ReadOnlyCollection<string>(backing),
            _ => throw new InvalidOperationException("Unknown explicit input shape."),
        };
        var originalCount = original.Count;
        var payload = new ObservedPayload(backing, ids);
        IReadOnlyList<string> input = snapshotControl ? new HashSet<string>(original, StringComparer.Ordinal).ToArray() : original;
        await using var fixture = new BroadcastSendFixture(ids, input, snapshotControl ? ids : [], [payload],
            expectSingleRecipient: !snapshotControl);
        await fixture.Send();
        if (snapshotControl)
        {
            fixture.Validate(objectPayload: true);
        }
        else
        {
            fixture.ValidateSingleDelivery();
        }
        Evidence.Require(original.Count == originalCount && ids.Select((id, index) => original[index] == id).All(value => value),
            "The same-count caller-owned mutation did not run.");
        Evidence.Require(payload.Reads == 1, "Actual JSON payload getter not reached exactly once.");

        return new
        {
            shape, snapshotInputControl = snapshotControl, shippingSourceCandidate = false,
            implementedIndexedOwner = false, originalCount, finalCount = original.Count,
            originalIsReadOnly = backing.IsReadOnly, wrapperIsReadOnly = original is ICollection<string> collection && collection.IsReadOnly,
            getterReads = payload.Reads, originalValuesAfterSend = original.ToArray(), actual = fixture.Observe(),
        };
    }

    private static async Task<object> CustomCollectionContainsDispatch(bool snapshotControl)
    {
        var collection = new DispatchList(["connection"]);
        IReadOnlyList<string> input = snapshotControl ? new HashSet<string>(collection, StringComparer.Ordinal).ToArray() : collection;
        var readsBeforeSend = collection.EnumeratorCalls;
        await using var fixture = new BroadcastSendFixture(["CONNECTION", "other"], input,
            snapshotControl ? ["CONNECTION", "other"] : ["other"], ["World"]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(collection.ContainsCalls == (snapshotControl ? 0 : 2), "Native ICollection.Contains dispatch differs.");
        Evidence.Require(collection.EnumeratorCalls == readsBeforeSend, "The original send enumerated the custom collection.");

        return new
        {
            snapshotInputControl = snapshotControl, shippingSourceCandidate = false, collection.ContainsCalls,
            collection.EnumeratorCalls, enumerationBeforeSend = readsBeforeSend, customComparison = "OrdinalIgnoreCase",
            snapshotComparison = snapshotControl ? "Ordinal" : null, actual = fixture.Observe(),
        };
    }

    private static async Task<object> RepeatedMissEnumeration(int connectionCount, int exclusionSize)
    {
        var ids = Enumerable.Range(0, connectionCount).Select(index => $"c{index:D4}").ToArray();
        var excluded = new CountedList(Enumerable.Range(0, exclusionSize).Select(index => $"missing-{index:D4}").ToArray());
        await using var fixture = new BroadcastSendFixture(ids, excluded, ids, ["World"]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(excluded.EnumeratorCalls == connectionCount && excluded.ValuesYielded == connectionCount * exclusionSize &&
            excluded.CountReads == 0 && excluded.IndexerReads == 0, "The real owner miss-path scan was not established.");

        return new
        {
            connectionCount, exclusionSize, excluded.EnumeratorCalls, excluded.ValuesYielded, excluded.CountReads,
            excluded.IndexerReads, instrumentationTimed = false, actual = fixture.Observe(),
        };
    }

    private static async Task<object> ActualPipeWrites(bool cancel)
    {
        var manager = new DefaultHubLifetimeManager<Hub>(NullLogger<DefaultHubLifetimeManager<Hub>>.Instance);
        var pipes = new[] { new Pipe(new PipeOptions(pauseWriterThreshold: 1, resumeWriterThreshold: 1, useSynchronizationContext: false)),
            new Pipe(new PipeOptions(pauseWriterThreshold: 1, resumeWriterThreshold: 1, useSynchronizationContext: false)) };
        var connections = new DefaultConnectionContext[2];
        var hubs = new HubConnectionContext[2];
        using var cancellation = new CancellationTokenSource();
        try
        {
            for (var index = 0; index < pipes.Length; index++)
            {
                var connection = new DefaultConnectionContext($"pipe-{index}")
                {
                    Transport = new BroadcastSendFixture.Transport(PipeReader.Create(Stream.Null), pipes[index].Writer),
                };
                var hub = new HubConnectionContext(connection, new HubConnectionContextOptions
                {
                    KeepAliveInterval = Timeout.InfiniteTimeSpan,
                }, NullLoggerFactory.Instance)
                {
                    Protocol = new JsonHubProtocol(),
                };
                connections[index] = connection;
                hubs[index] = hub;
                await manager.OnConnectedAsync(hub);
            }
            var send = manager.SendAllExceptAsync("Probe", ["World"], [], cancellation.Token);
            Evidence.Require(!send.IsCompleted, "Real backpressure did not make both writes pending.");
            var canceled = false;
            var frames = new List<string>();
            if (cancel)
            {
                cancellation.Cancel();
                try
                {
                    await send.WaitAsync(TimeSpan.FromSeconds(10));
                }
                catch (OperationCanceledException)
                {
                    canceled = true;
                }
                Evidence.Require(canceled && send.IsCanceled, "Real pending send did not propagate cancellation.");
            }
            for (var index = 0; index < pipes.Length; index++)
            {
                var read = await pipes[index].Reader.ReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(10));
                var bytes = read.Buffer.ToArray();
                BroadcastSendFixture.ValidateFrame(bytes);
                frames.Add(System.Text.Encoding.UTF8.GetString(bytes));
                pipes[index].Reader.AdvanceTo(read.Buffer.End);
                if (!cancel && index == 0)
                {
                    Evidence.Require(!send.IsCompleted, "The broadcast completed before the other actual pipe was drained.");
                }
            }
            if (!cancel)
            {
                await send.WaitAsync(TimeSpan.FromSeconds(10));
                Evidence.Require(send.IsCompletedSuccessfully, "Draining both real pipes did not complete the send.");
            }
            Evidence.Require(hubs.All(hub => !hub.ConnectionAborted.IsCancellationRequested), "Cancellation unexpectedly aborted a connection.");

            return new
            {
                actualPipes = 2, pauseWriterThreshold = 1, actualFrames = frames, cancellationRequested = cancel,
                cancellationObserved = canceled, taskStatus = send.Status.ToString(), actualAbortedConnections = 0,
                copiedFilterOrInjectedManagerCallback = false,
            };
        }
        finally
        {
            for (var index = 0; index < pipes.Length; index++)
            {
                await pipes[index].Writer.CompleteAsync();
                await pipes[index].Reader.CompleteAsync();
                if (connections[index] is { } connection)
                {
                    await manager.OnDisconnectedAsync(hubs[index]);
                    await connection.Transport.Input.CompleteAsync();
                    await connection.DisposeAsync();
                }
            }
        }
    }

    private sealed class ObservedPayload(IList<string>? backing = null, string[]? ids = null, bool throwIfRead = false)
    {
        [JsonIgnore]
        public int Reads { get; private set; }

        public string Value
        {
            get
            {
                Reads++;
                if (throwIfRead)
                {
                    throw new InvalidOperationException("An entirely excluded payload must not be serialized.");
                }
                if (backing is not null && ids is not null)
                {
                    for (var index = 0; index < ids.Length; index++)
                    {
                        backing[index] = ids[index];
                    }
                }

                return "World";
            }
        }
    }

    private sealed class UnreadableList : IReadOnlyList<string>
    {
        public int Reads { get; private set; }
        private Exception UnexpectedRead()
        {
            Reads++;

            return new InvalidOperationException("An empty connection store must not inspect exclusions.");
        }
        public int Count => throw UnexpectedRead();
        public string this[int index] => throw UnexpectedRead();
        public IEnumerator<string> GetEnumerator() => throw UnexpectedRead();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

    private sealed class DispatchList(string[] values) : IReadOnlyList<string>, ICollection<string>
    {
        public int ContainsCalls { get; private set; }
        public int EnumeratorCalls { get; private set; }
        public int Count => values.Length;
        public bool IsReadOnly => true;
        public string this[int index] => values[index];
        public bool Contains(string item)
        {
            ContainsCalls++;

            return values.Contains(item, StringComparer.OrdinalIgnoreCase);
        }
        public IEnumerator<string> GetEnumerator()
        {
            EnumeratorCalls++;

            return ((IEnumerable<string>)values).GetEnumerator();
        }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
        public void CopyTo(string[] array, int index) => values.CopyTo(array, index);
        public void Add(string item) => throw new NotSupportedException();
        public void Clear() => throw new NotSupportedException();
        public bool Remove(string item) => throw new NotSupportedException();
    }

    private sealed class CountedList(string[] values) : IReadOnlyList<string>
    {
        public int EnumeratorCalls { get; private set; }
        public int ValuesYielded { get; private set; }
        public int CountReads { get; private set; }
        public int IndexerReads { get; private set; }
        public int Count
        {
            get
            {
                CountReads++;

                return values.Length;
            }
        }
        public string this[int index]
        {
            get
            {
                IndexerReads++;

                return values[index];
            }
        }
        public IEnumerator<string> GetEnumerator()
        {
            EnumeratorCalls++;

            return Enumerate();
        }
        private IEnumerator<string> Enumerate()
        {
            foreach (var value in values)
            {
                ValuesYielded++;
                yield return value;
            }
        }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}
