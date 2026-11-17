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
        await RunCase("LargeTargetScopeCaseAndDuplicates", LargeTargetScopeCaseAndDuplicates);
        await RunCase("EmptyConnectionStoreOnlyReadsTargetCount", EmptyConnectionStoreOnlyReadsTargetCount);
        await RunCase("AllMissingDoesNotSerializeCanceledSend", AllMissingDoesNotSerializeCanceledSend);
        await RunCase("JsonPayloadSerializedOnceForAllRecipients", JsonPayloadSerializedOnceForAllRecipients);
        foreach (var shape in new[] { "Array", "List", "ReadOnlyWrapper" })
        {
            await RunCase("Live" + shape + "MutationAtJsonGetter", () => MutationAtJsonGetter(shape, snapshotControl: false));
            await RunCase("SnapshotInputControl" + shape, () => MutationAtJsonGetter(shape, snapshotControl: true));
        }
        await RunCase("CustomCollectionContainsDispatch", () => CustomCollectionContainsDispatch(snapshotControl: false));
        await RunCase("SnapshotInputControlCustomDispatch", () => CustomCollectionContainsDispatch(snapshotControl: true));
        await RunCase("DerivedListRetainsCustomContainsDispatch", DerivedListRetainsCustomContainsDispatch);
        foreach (var dimensions in new[] { (Connections: 1, Targets: 17), (Connections: 8, Targets: 32), (Connections: 32, Targets: 64) })
        {
            await RunCase($"RepeatedMissEnumerationC{dimensions.Connections}T{dimensions.Targets}",
                () => RepeatedMissEnumeration(dimensions.Connections, dimensions.Targets));
        }
        await RunCase("PendingWritesWaitForEveryPipe", () => ActualPipeWrites(cancel: false));
        await RunCase("PendingWritesCancelThroughActualPipes", () => ActualPipeWrites(cancel: true));

        return checks;
    }


    private static async Task<object> LargeTargetScopeCaseAndDuplicates()
    {
        string[] ids = ["connection", "CONNECTION", "Connection", "outside"];
        var targets = LargeTargets("connection", "connection", "outside");
        await using var fixture = new TargetedSendFixture(ids, targets,
            ["connection", "outside"], ["World"], groupMembers: 3);
        await fixture.Send();
        fixture.Validate();

        return new { targetCount = targets.Length, actual = fixture.Observe() };
    }

    private static async Task<object> EmptyConnectionStoreOnlyReadsTargetCount()
    {
        var targets = new UnreadableList();
        var payload = new ObservedPayload(throwIfRead: true);
        await using var fixture = new TargetedSendFixture([], targets, [], [payload]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(targets.CountReads == 1 && targets.Reads == 0 && payload.Reads == 0, "An empty connection store touched exclusions or serialized arguments.");

        return new { targetCountReads = targets.CountReads, inputReadsBeyondCount = targets.Reads, argumentGetterReads = payload.Reads, actual = fixture.Observe() };
    }

    private static async Task<object> AllMissingDoesNotSerializeCanceledSend()
    {
        var payload = new ObservedPayload(throwIfRead: true);
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await using var fixture = new TargetedSendFixture(["c0000", "c0001"], LargeTargets(),
            [], [payload]);
        var send = fixture.Send(cancellation.Token);
        Evidence.Require(send.IsCompletedSuccessfully, "An entirely targets send should not initiate canceled writes.");
        await send;
        fixture.Validate(objectPayload: true);
        Evidence.Require(payload.Reads == 0, "An entirely targets targeted send serialized the argument.");

        return new { argumentGetterReads = payload.Reads, canceledToken = true, actual = fixture.Observe() };
    }

    private static async Task<object> JsonPayloadSerializedOnceForAllRecipients()
    {
        string[] ids = ["c0000", "c0001", "c0002"];
        var payload = new ObservedPayload();
        await using var fixture = new TargetedSendFixture(ids, LargeTargets(ids), ids, [payload]);
        await fixture.Send();
        fixture.Validate(objectPayload: true);
        Evidence.Require(payload.Reads == 1, "The real JSON serialization cache did not serialize once.");

        return new { argumentGetterReads = payload.Reads, actual = fixture.Observe() };
    }

    private static async Task<object> MutationAtJsonGetter(string shape, bool snapshotControl)
    {
        var ids = Enumerable.Range(0, 8).Select(index => $"c{index:D4}").ToArray();
        var initial = LargeTargets(ids);
        var removed = ids.Select(id => "removed-" + id).ToArray();
        IList<string> backing = shape == "Array" ? initial : initial.ToList();
        IReadOnlyList<string> original = shape switch
        {
            "Array" => (string[])backing,
            "List" => (List<string>)backing,
            "ReadOnlyWrapper" => new ReadOnlyCollection<string>(backing),
            _ => throw new InvalidOperationException("Unknown explicit input shape."),
        };
        var originalCount = original.Count;
        Evidence.Require(originalCount == 17, "The mutation probe must exercise the actual >16 path.");
        var payload = new ObservedPayload(backing, removed);
        IReadOnlyList<string> input = snapshotControl ? new HashSet<string>(original, StringComparer.Ordinal).ToArray() : original;
        Evidence.Require(input.Count == 17, "A copied-input control must not cross the existing16-target boundary.");
        await using var fixture = new TargetedSendFixture(ids, input, snapshotControl ? ids : [], [payload],
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
        Evidence.Require(original.Count == originalCount && removed.Select((id, index) => original[index] == id).All(value => value),
            "The same-count caller-owned mutation did not run.");
        Evidence.Require(payload.Reads == 1, "Actual JSON payload getter not reached exactly once.");

        return new
        {
            shape, snapshotInputControl = snapshotControl, inputSnapshotIsShippingImplementation = false,
            implementedIndexedOwner = false, originalCount, finalCount = original.Count,
            originalIsReadOnly = backing.IsReadOnly, wrapperIsReadOnly = original is ICollection<string> collection && collection.IsReadOnly,
            getterReads = payload.Reads, originalValuesAfterSend = original.ToArray(), actual = fixture.Observe(),
        };
    }

    private static async Task<object> CustomCollectionContainsDispatch(bool snapshotControl)
    {
        var collection = new DispatchList(LargeTargets("connection"));
        IReadOnlyList<string> input = snapshotControl ? new HashSet<string>(collection, StringComparer.Ordinal).ToArray() : collection;
        var readsBeforeSend = collection.EnumeratorCalls;
        await using var fixture = new TargetedSendFixture(["CONNECTION", "other"], input,
            snapshotControl ? [] : ["CONNECTION"], ["World"]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(collection.ContainsCalls == (snapshotControl ? 0 : 2), "Native ICollection.Contains dispatch differs.");
        Evidence.Require(collection.EnumeratorCalls == readsBeforeSend, "The original send enumerated the custom collection.");

        return new
        {
            snapshotInputControl = snapshotControl, inputSnapshotIsShippingImplementation = false, collection.ContainsCalls,
            collection.EnumeratorCalls, enumerationBeforeSend = readsBeforeSend, customComparison = "OrdinalIgnoreCase",
            snapshotComparison = snapshotControl ? "Ordinal" : null, actual = fixture.Observe(),
        };
    }

    private static async Task<object> DerivedListRetainsCustomContainsDispatch()
    {
        var targets = new DerivedDispatchList();
        targets.AddRange(LargeTargets("connection"));
        await using var fixture = new TargetedSendFixture(["CONNECTION", "other"], targets, ["CONNECTION"], ["World"]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(targets.Count == 17 && targets.ContainsCalls == 2, "Derived List ICollection.Contains dispatch was bypassed.");

        return new { targetCount = targets.Count, targets.ContainsCalls, customComparison = "OrdinalIgnoreCase", actual = fixture.Observe() };
    }

    private sealed class DerivedDispatchList : List<string>, ICollection<string>
    {
        public int ContainsCalls { get; private set; }
        bool ICollection<string>.Contains(string value)
        {
            ContainsCalls++;

            return this.Contains(value, StringComparer.OrdinalIgnoreCase);
        }
    }

    private static async Task<object> RepeatedMissEnumeration(int connectionCount, int targetSize)
    {
        var ids = Enumerable.Range(0, connectionCount).Select(index => $"c{index:D4}").ToArray();
        var targets = new CountedList(Enumerable.Range(0, targetSize).Select(index => $"missing-{index:D4}").ToArray());
        await using var fixture = new TargetedSendFixture(ids, targets, [], ["World"]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(targets.EnumeratorCalls == connectionCount && targets.ValuesYielded == connectionCount * targetSize &&
            targets.CountReads == 1 && targets.IndexerReads == 0, "The real owner miss-path scan was not established.");

        return new
        {
            connectionCount, targetSize, targets.EnumeratorCalls, targets.ValuesYielded, targets.CountReads,
            targets.IndexerReads, instrumentationTimed = false, actual = fixture.Observe(),
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
                    Transport = new TargetedSendFixture.Transport(PipeReader.Create(Stream.Null), pipes[index].Writer),
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
            var send = manager.SendConnectionsAsync(LargeTargets("pipe-0", "pipe-1"), "Probe", ["World"], cancellation.Token);
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
                TargetedSendFixture.ValidateFrame(bytes);
                frames.Add(System.Text.Encoding.UTF8.GetString(bytes));
                pipes[index].Reader.AdvanceTo(read.Buffer.End);
                if (!cancel && index == 0)
                {
                    Evidence.Require(!send.IsCompleted, "The targeted send completed before the other actual pipe was drained.");
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

    private static string[] LargeTargets(params string[] ids)
    {
        return ids.Concat(Enumerable.Range(0, 17 - ids.Length).Select(index => $"missing-{index:D4}")).ToArray();
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
                    throw new InvalidOperationException("An entirely targets payload must not be serialized.");
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
        public int CountReads { get; private set; }
        private Exception UnexpectedRead()
        {
            Reads++;

            return new InvalidOperationException("An empty store must not read targets beyond the required Count.");
        }
        public int Count
        {
            get
            {
                CountReads++;

                return 17;
            }
        }
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
