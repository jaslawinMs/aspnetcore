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
        await RunCase("UserScopeCaseDuplicatesAndMultipleConnections", UserScopeCaseDuplicatesAndMultipleConnections);
        await RunCase("DefaultUserIdProviderProducesAbsentClaimNulls", DefaultUserIdProviderProducesAbsentClaimNulls);
        await RunCase("EmptyConnectionStoreDoesNotReadTargets", EmptyConnectionStoreDoesNotReadTargets);
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
        foreach (var dimensions in new[] { (Connections: 1, Targets: 1), (Connections: 8, Targets: 16), (Connections: 32, Targets: 64) })
        {
            await RunCase($"RepeatedMissEnumerationC{dimensions.Connections}T{dimensions.Targets}",
                () => RepeatedMissEnumeration(dimensions.Connections, dimensions.Targets));
        }
        await RunCase("PendingWritesWaitForEveryPipe", () => ActualPipeWrites(cancel: false));
        await RunCase("PendingWritesCancelThroughActualPipes", () => ActualPipeWrites(cancel: true));

        return checks;
    }

    private static async Task<object> UserScopeCaseDuplicatesAndMultipleConnections()
    {
        string[] ids = ["c-lower", "c-upper", "c-title", "c-outside", "c-shared"];
        string?[] users = ["user", "USER", "User", "outside", "user"];
        var targets = LargeTargets("user", "user", "outside");
        await using var fixture = new UserSendFixture(ids, users, targets,
            ["c-lower", "c-outside", "c-shared"], ["World"], groupMembers: 3);
        await fixture.Send();
        fixture.Validate();

        return new { targetCount = targets.Length, actual = fixture.Observe() };
    }

    private static async Task<object> DefaultUserIdProviderProducesAbsentClaimNulls()
    {
        await using var fixture = new UserSendFixture(["named", "unnamed-a", "unnamed-b"], ["user", null, null],
            LargeTargets("user", "display-name-is-not-user-identifier"), ["named"], ["World"]);
        await fixture.Send();
        fixture.Validate();

        return new { absentNameIdentifierClaims = 2, actual = fixture.Observe() };
    }

    private static async Task<object> EmptyConnectionStoreDoesNotReadTargets()
    {
        var targets = new UnreadableList();
        var payload = new ObservedPayload(throwIfRead: true);
        await using var fixture = new UserSendFixture([], [], targets, [], [payload]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(targets.CountReads == 0 && targets.Reads == 0 && payload.Reads == 0,
            "An empty user-send connection store read targets or serialized arguments.");

        return new { targetCountReads = targets.CountReads, inputReadsBeyondCount = targets.Reads,
            argumentGetterReads = payload.Reads, actual = fixture.Observe() };
    }

    private static async Task<object> AllMissingDoesNotSerializeCanceledSend()
    {
        var payload = new ObservedPayload(throwIfRead: true);
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await using var fixture = new UserSendFixture(["c0000", "c0001"], ["user-0", "user-1"], LargeTargets(),
            [], [payload]);
        var send = fixture.Send(cancellation.Token);
        Evidence.Require(send.IsCompletedSuccessfully, "An all-missing user send should not initiate canceled writes.");
        await send;
        fixture.Validate(objectPayload: true);
        Evidence.Require(payload.Reads == 0, "An all-missing user send serialized its argument.");

        return new { argumentGetterReads = payload.Reads, canceledToken = true, actual = fixture.Observe() };
    }

    private static async Task<object> JsonPayloadSerializedOnceForAllRecipients()
    {
        string[] ids = ["c0000", "c0001", "c0002"];
        string[] users = ["user-0", "user-1", "user-2"];
        var payload = new ObservedPayload();
        await using var fixture = new UserSendFixture(ids, users, LargeTargets(users), ids, [payload]);
        await fixture.Send();
        fixture.Validate(objectPayload: true);
        Evidence.Require(payload.Reads == 1, "The real user-send JSON cache did not serialize once.");

        return new { argumentGetterReads = payload.Reads, actual = fixture.Observe() };
    }

    private static async Task<object> MutationAtJsonGetter(string shape, bool snapshotControl)
    {
        var ids = Enumerable.Range(0, 8).Select(index => $"c{index:D4}").ToArray();
        var users = Enumerable.Range(0, 8).Select(index => $"user-{index:D4}").ToArray();
        var initial = LargeTargets(users);
        var removed = users.Select(user => "removed-" + user).ToArray();
        IList<string> backing = shape == "Array" ? initial : initial.ToList();
        IReadOnlyList<string> original = shape switch
        {
            "Array" => (string[])backing,
            "List" => (List<string>)backing,
            "ReadOnlyWrapper" => new ReadOnlyCollection<string>(backing),
            _ => throw new InvalidOperationException("Unknown explicit input shape."),
        };
        var originalCount = original.Count;
        Evidence.Require(originalCount == 64, "The real getter probe requires the declared64-target input.");
        var payload = new ObservedPayload(backing, removed);
        IReadOnlyList<string> input = snapshotControl ? new HashSet<string>(original, StringComparer.Ordinal).ToArray() : original;
        Evidence.Require(input.Count == 64, "A copied-input control must retain the same declared64-target size.");
        await using var fixture = new UserSendFixture(ids, users, input, snapshotControl ? ids : [], [payload],
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
        Evidence.Require(original.Count == originalCount && removed.Select((user, index) => original[index] == user).All(value => value),
            "The same-count caller-owned user-ID mutation did not run.");
        Evidence.Require(payload.Reads == 1, "Actual user-send JSON getter not reached exactly once.");

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
        var collection = new DispatchList(LargeTargets("user"));
        IReadOnlyList<string> input = snapshotControl ? new HashSet<string>(collection, StringComparer.Ordinal).ToArray() : collection;
        var readsBeforeSend = collection.EnumeratorCalls;
        await using var fixture = new UserSendFixture(["c-upper", "c-other"], ["USER", "other"], input,
            snapshotControl ? [] : ["c-upper"], ["World"]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(collection.ContainsCalls == (snapshotControl ? 0 : 2), "Native user-list ICollection.Contains dispatch differs.");
        Evidence.Require(collection.EnumeratorCalls == readsBeforeSend, "The original user send enumerated the custom collection.");

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
        targets.AddRange(LargeTargets("user"));
        await using var fixture = new UserSendFixture(["c-upper", "c-other"], ["USER", "other"], targets, ["c-upper"], ["World"]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(targets.Count == 64 && targets.ContainsCalls == 2, "Derived user-list ICollection.Contains dispatch was bypassed.");

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
        var users = Enumerable.Range(0, connectionCount).Select(index => $"user-{index:D4}").ToArray();
        var targets = new CountedList(Enumerable.Range(0, targetSize).Select(index => $"missing-{index:D4}").ToArray());
        await using var fixture = new UserSendFixture(ids, users, targets, [], ["World"]);
        await fixture.Send();
        fixture.Validate();
        Evidence.Require(targets.EnumeratorCalls == connectionCount && targets.ValuesYielded == connectionCount * targetSize &&
            targets.CountReads == 0 && targets.IndexerReads == 0, "The actual user-send miss scan was not established.");

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
        var provider = new DefaultUserIdProvider();
        using var cancellation = new CancellationTokenSource();
        try
        {
            for (var index = 0; index < pipes.Length; index++)
            {
                var connection = new DefaultConnectionContext($"pipe-{index}")
                {
                    User = UserSendFixture.CreatePrincipal($"pipe-user-{index}"),
                    Transport = new UserSendFixture.Transport(PipeReader.Create(Stream.Null), pipes[index].Writer),
                };
                var hub = new HubConnectionContext(connection, new HubConnectionContextOptions
                {
                    KeepAliveInterval = Timeout.InfiniteTimeSpan,
                }, NullLoggerFactory.Instance)
                {
                    Protocol = new JsonHubProtocol(),
                };
                hub.UserIdentifier = provider.GetUserId(hub);
                Evidence.Require(hub.UserIdentifier == $"pipe-user-{index}", "Actual pipe user-ID provider output differs.");
                connections[index] = connection;
                hubs[index] = hub;
                await manager.OnConnectedAsync(hub);
            }
            var send = manager.SendUsersAsync(LargeTargets("pipe-user-0", "pipe-user-1"), "Probe", ["World"], cancellation.Token);
            Evidence.Require(!send.IsCompleted, "Real backpressure did not make both user writes pending.");
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
                Evidence.Require(canceled && send.IsCanceled, "Actual pending user send did not propagate cancellation.");
            }
            for (var index = 0; index < pipes.Length; index++)
            {
                var read = await pipes[index].Reader.ReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(10));
                var bytes = read.Buffer.ToArray();
                UserSendFixture.ValidateFrame(bytes);
                frames.Add(System.Text.Encoding.UTF8.GetString(bytes));
                pipes[index].Reader.AdvanceTo(read.Buffer.End);
                if (!cancel && index == 0)
                {
                    Evidence.Require(!send.IsCompleted, "User send completed before the other actual pipe was drained.");
                }
            }
            if (!cancel)
            {
                await send.WaitAsync(TimeSpan.FromSeconds(10));
                Evidence.Require(send.IsCompletedSuccessfully, "Draining both real user pipes did not complete the send.");
            }
            Evidence.Require(hubs.All(hub => !hub.ConnectionAborted.IsCancellationRequested), "Cancellation unexpectedly aborted a user connection.");

            return new
            {
                actualPipes = 2, pauseWriterThreshold = 1, actualFrames = frames, cancellationRequested = cancel,
                cancellationObserved = canceled, taskStatus = send.Status.ToString(), actualAbortedConnections = 0,
                actualUserIdentifiers = hubs.Select(hub => hub.UserIdentifier).ToArray(),
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

    private static string[] LargeTargets(params string[] users)
    {
        return users.Concat(Enumerable.Range(0, 64 - users.Length).Select(index => $"missing-{index:D4}")).ToArray();
    }

    private sealed class ObservedPayload(IList<string>? backing = null, string[]? users = null, bool throwIfRead = false)
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
                    throw new InvalidOperationException("An all-missing user payload must not be serialized.");
                }
                if (backing is not null && users is not null)
                {
                    for (var index = 0; index < users.Length; index++)
                    {
                        backing[index] = users[index];
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

            return new InvalidOperationException("An empty store must not read the target input.");
        }
        public int Count
        {
            get
            {
                CountReads++;

                return 64;
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
