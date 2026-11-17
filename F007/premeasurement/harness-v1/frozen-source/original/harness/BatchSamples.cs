using System.Text;
using System.Text.Json;

namespace AutoPerf;

public enum Shape
{
    RemoveEmpty,
    Remove1,
    Remove16,
    Remove100,
    Remove128,
    Remove129,
    Remove256,
    Remove1024,
    Remove4096,
    Remove16384,
    Resume1,
    Resume100,
    Resume128,
    Resume129,
    Resume1024,
    Resume4096,
    Resume16384,
    DuplicateEarly129,
    DuplicateLast129,
    DuplicateMiddle4096,
    DuplicateEarly4096,
    DuplicateLast4096
}

internal sealed record BatchSample(string Label, string Json, bool DeserializeMarkers, bool ExpectedSuccess,
    OperationSpec[] Operations, int? ExpectedLogId = null, string? ExpectedLogMessage = null)
{
    public void WriteProof(ServerAdapter adapter, string role)
    {
        var file = Path.Combine(Evidence.InputDirectory, Label + ".json");
        File.WriteAllText(file, Json, new UTF8Encoding(false));
        Evidence.Write("producer", new
        {
            Label, role, DeserializeMarkers, ExpectedSuccess, ExpectedLogId, ExpectedLogMessage,
            operationCount = Operations.Length, firstDuplicateIndex = DuplicateIndex(),
            ids = Operations.Select(item => item.Id), kinds = Operations.Select(item => item.Kind),
            actualJsonBytes = Encoding.UTF8.GetByteCount(Json), inputSha256 = Evidence.Hash(file),
            typedProducer = adapter.TypeIdentity(),
            productionBoundary = "Full actual Server JSON batch deserializer. Remove inputs do not exercise subsequent circuit removal;resume inputs use actual marker-disabled parser branch,not persisted-descriptor restoration or rendering.",
            volume = Operations.Length > 100 ? "Boundary/scaling stress;not established default-app batch frequency." : "Small/default-root-count control;not a measured production distribution."
        });
    }

    private int? DuplicateIndex()
    {
        var ids = new HashSet<int>();
        for (var index = 0; index < Operations.Length; index++)
        {
            if (!ids.Add(Operations[index].Id))
            {
                return index;
            }
        }

        return null;
    }

    public BatchObservation? Validate(ServerAdapter adapter, object owner, CaptureSink? sink = null)
    {
        sink?.Entries.Clear();
        var success = adapter.Parse(owner, Json, out var output, DeserializeMarkers);
        Evidence.Require(success == ExpectedSuccess, Label + ":actual Boolean result differs.");
        Evidence.Require((output is not null) == ExpectedSuccess, Label + ":actual null/result contract differs.");
        BatchObservation? observation = null;
        if (output is not null)
        {
            observation = adapter.Observe(output);
            Evidence.Require(observation.BatchId == 71 && observation.Operations.Length == Operations.Length, Label + ":batch identity/count differs.");
            for (var index = 0; index < Operations.Length; index++)
            {
                var actual = observation.Operations[index];
                var expected = Operations[index];
                Evidence.Require(actual.Id == expected.Id && actual.Kind == expected.Kind
                    && actual.HasMarker == (expected.Marker is not null), Label + ":actual wire order/ID/kind/marker differs.");
                Evidence.Require(actual.HasDescriptor == (DeserializeMarkers && expected.Kind != "Remove"),
                    Label + ":actual descriptor mode differs.");
            }
        }
        if (sink is not null)
        {
            if (ExpectedLogId is null)
            {
                Evidence.Require(sink.Entries.Count == 0, Label + ":unexpected actual log.");
            }
            else
            {
                Evidence.Require(sink.Entries.Count == 1 && sink.Entries[0].Id == ExpectedLogId
                    && sink.Entries[0].Level == "Debug", Label + ":actual first-invalid log/event/level differs.");
                if (ExpectedLogMessage is not null)
                {
                    Evidence.Require(sink.Entries[0].Fields.TryGetValue("Message", out var message)
                        && message == ExpectedLogMessage, Label + ":actual first-invalid reason differs.");
                }
            }
        }
        Evidence.Write("validated", new
        {
            Label, success, resultNull = output is null, DeserializeMarkers,
            observation, logs = sink?.Entries, state = adapter.State(owner), passed = true
        });

        return observation;
    }
}

internal static class BatchSamples
{
    public static BatchSample Timed(ServerAdapter adapter, Shape shape)
    {
        var count = shape switch
        {
            Shape.RemoveEmpty => 0,
            Shape.Remove1 or Shape.Resume1 => 1,
            Shape.Remove16 => 16,
            Shape.Remove100 or Shape.Resume100 => 100,
            Shape.Remove128 or Shape.Resume128 => 128,
            Shape.Remove129 or Shape.Resume129 or Shape.DuplicateEarly129 or Shape.DuplicateLast129 => 129,
            Shape.Remove256 => 256,
            Shape.Remove1024 or Shape.Resume1024 => 1024,
            Shape.Remove16384 or Shape.Resume16384 => 16384,
            Shape.Remove4096 or Shape.Resume4096 or Shape.DuplicateMiddle4096 or Shape.DuplicateEarly4096 or Shape.DuplicateLast4096 => 4096,
            _ => throw new ArgumentOutOfRangeException(nameof(shape))
        };
        var resume = shape.ToString().StartsWith("Resume", StringComparison.Ordinal);
        var operations = Enumerable.Range(0, count)
            .Select(index => new OperationSpec(resume ? "Add" : "Remove", index,
                resume ? adapter.CreateBareMarker() : null)).ToArray();
        var duplicate = shape switch
        {
            Shape.DuplicateEarly129 or Shape.DuplicateEarly4096 => 1,
            Shape.DuplicateMiddle4096 => 2048,
            Shape.DuplicateLast129 or Shape.DuplicateLast4096 => count - 1,
            _ => -1
        };
        if (duplicate >= 0)
        {
            operations[duplicate] = operations[duplicate] with { Id = 0 };
        }

        return Create(adapter, shape.ToString(), operations, !resume, duplicate < 0,
            duplicate < 0 ? null : 11, duplicate < 0 ? null : "Duplicate component ID.");
    }

    public static BatchSample Create(ServerAdapter adapter, string label, OperationSpec[] operations,
        bool deserializeMarkers = true, bool success = true, int? logId = null, string? logMessage = null) =>
        new(label, adapter.Serialize(operations), deserializeMarkers, success, operations, logId, logMessage);

    public static int Characterize(ServerAdapter adapter)
    {
        var count = 0;
        void Check(BatchSample sample)
        {
            var sink = new CaptureSink();
            var actualOwner = adapter.CreateOwner(sink);
            sample.WriteProof(adapter, "untimed-characterization");
            sample.Validate(adapter, actualOwner, sink);
            count++;
        }
        foreach (var shape in Enum.GetValues<Shape>())
        {
            var sample = Timed(adapter, shape);
            var sink = new CaptureSink();
            var owner = adapter.CreateOwner(sink);
            sample.WriteProof(adapter, "untimed-characterization");
            for (var repeat = 0; repeat < 2; repeat++)
            {
                sample.Validate(adapter, owner, sink);
                Evidence.Require(adapter.State(owner) is { CurrentInvocation: null, ExpiredInvocations: 0, SeenSequences.Length: 0 },
                    "Remove and marker-disabled repeated batches must not consume descriptor state.");
                count++;
            }
        }
        foreach (var size in new[] { 2, 16, 100, 127, 128, 129, 256, 1024 })
        {
            foreach (var deserialize in new[] { true, false })
            {
                var operations = Enumerable.Range(0, size).Select(index => new OperationSpec("Remove", index)).ToArray();
                Check(Create(adapter, $"Boundary{size}Mode{deserialize}", operations, deserialize));
                foreach (var position in new[] { 1, size / 2, size - 1 }.Distinct())
                {
                    var duplicate = operations.ToArray();
                    duplicate[position] = duplicate[position] with { Id = 0 };
                    Check(Create(adapter, $"Duplicate{size}At{position}Mode{deserialize}", duplicate,
                        deserialize, false, 11, "Duplicate component ID."));
                }
            }
        }
        var extremes = new[] { int.MinValue, 0, int.MaxValue, -1, 7654321 }
            .Select(id => new OperationSpec("Remove", id)).ToArray();
        Check(Create(adapter, "SparseExtremeAndZero", extremes));
        Check(Create(adapter, "SparseExtremeDuplicate", [.. extremes, extremes[0]], success: false,
            logId: 11, logMessage: "Duplicate component ID."));
        Check(Create(adapter, "MissingBeforeDuplicate", [new("Add", 0), new("Remove", 0)], success: false,
            logId: 11, logMessage: "Missing marker."));
        Check(Create(adapter, "DuplicateBeforeMissing", [new("Remove", 0), new("Add", 0)], success: false,
            logId: 11, logMessage: "Duplicate component ID."));
        Check(Create(adapter, "DuplicateBeforeInvalidMarker", [new("Remove", 0), new("Update", 0, adapter.CreateBareMarker())],
            success: false, logId: 11, logMessage: "Duplicate component ID."));
        Check(Create(adapter, "ResumeStillNeedsMarker", [new("Add", 0)], deserializeMarkers: false, success: false,
            logId: 11, logMessage: "Missing marker."));
        Check(Create(adapter, "EnabledRejectsBareMarker", [new("Add", 0, adapter.CreateBareMarker())], success: false, logId: 4));
        Check(Create(adapter, "ResumeMixed", [new("Add", 1, adapter.CreateBareMarker()), new("Update", 2, adapter.CreateBareMarker()), new("Remove", 3)],
            deserializeMarkers: false));
        foreach (var (label, json) in new[]
        {
            ("MalformedJson", "{"), ("NullBatch", "null"), ("MissingOperations", "{}"),
            ("NullOperations", "{\"operations\":null}"), ("NullOperation", "{\"operations\":[null]}"),
            ("UnknownKind", "{\"operations\":[{\"type\":\"not-an-operation\",\"ssrComponentId\":1}]}"),
            ("FractionalId", "{\"operations\":[{\"type\":\"remove\",\"ssrComponentId\":1.5}]}"),
            ("OverflowId", "{\"operations\":[{\"type\":\"remove\",\"ssrComponentId\":2147483648}]}")
        })
        {
            Check(new(label, json, true, false, [], 12));
        }
        var invocation = adapter.CreateInvocation();
        var markers = Enumerable.Range(0, 3).Select(index => adapter.CreateRealMarker(invocation, 40 + index)).ToArray();
        var actual = Create(adapter, "RealAddUpdateRemove", [new("Add", 1, markers[0]), new("Update", 2, markers[1]), new("Remove", 3)]);
        var realSink = new CaptureSink();
        var realOwner = adapter.CreateOwner(realSink);
        actual.WriteProof(adapter, "actual-server-serializer-parameter-producer");
        var observed = actual.Validate(adapter, realOwner, realSink)!;
        for (var index = 0; index < 2; index++)
        {
            Evidence.Require(observed.Operations[index].Component == typeof(ProbeComponent).FullName
                && observed.Operations[index].Parameters is { Count: 1 } parameters
                && parameters[nameof(ProbeComponent.Value)] is int value && value == 40 + index,
                "Actual serializer/parameter-deserializer round-trip differs.");
        }
        Evidence.Require(adapter.State(realOwner).SeenSequences.SequenceEqual([0, 1]), "Actual producer sequence consumption differs.");
        count++;
        var replay = Create(adapter, "RealSequenceReplay", [new("Add", 99, markers[0])], success: false, logId: 10);
        replay.WriteProof(adapter, "same-owner-real-descriptor-state");
        replay.Validate(adapter, realOwner, realSink);
        count++;
        var next = Create(adapter, "RealNextSequenceSameSsrId", [new("Update", 1, markers[2])]);
        next.WriteProof(adapter, "same-owner-next-produced-sequence");
        next.Validate(adapter, realOwner, realSink);
        Evidence.Require(adapter.State(realOwner).SeenSequences.SequenceEqual([0, 1, 2]), "Actual next-sequence or per-batch ID reset differs.");
        count++;
        var another = adapter.CreateInvocation();
        var newMarker = adapter.CreateRealMarker(another, 123);
        var advance = Create(adapter, "RealNextInvocation", [new("Add", 1, newMarker)]);
        advance.WriteProof(adapter, "same-owner-next-produced-invocation");
        advance.Validate(adapter, realOwner, realSink);
        Evidence.Require(adapter.State(realOwner) is { ExpiredInvocations: 1, SeenSequences.Length: 1 }, "Actual invocation transition differs.");
        count++;
        var expired = Create(adapter, "RealExpiredInvocation", [new("Add", 5, markers[2])], success: false, logId: 9);
        expired.WriteProof(adapter, "same-owner-actual-expired-invocation");
        expired.Validate(adapter, realOwner, realSink);
        count++;
        var failedInvocation = adapter.CreateInvocation();
        var consumed = adapter.CreateRealMarker(failedInvocation, 8);
        var failedOwner = adapter.CreateOwner(realSink);
        var failed = Create(adapter, "RealMarkerConsumedBeforeDuplicate", [new("Add", 0, consumed), new("Remove", 0)],
            success: false, logId: 11, logMessage: "Duplicate component ID.");
        failed.WriteProof(adapter, "sequential-actual-marker-consumption-before-batch-failure");
        failed.Validate(adapter, failedOwner, realSink);
        Evidence.Require(adapter.State(failedOwner).SeenSequences.SequenceEqual([0]), "First real marker was not consumed before duplicate failure.");
        count++;
        var consumedReplay = Create(adapter, "RealConsumedAfterBatchFailure", [new("Update", 8, consumed)], success: false, logId: 10);
        consumedReplay.WriteProof(adapter, "same-owner-real-consumed-sequence-after-failed-batch");
        consumedReplay.Validate(adapter, failedOwner, realSink);
        count++;

        return count;
    }
}
