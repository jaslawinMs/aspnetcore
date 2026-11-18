// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Text.Json;
using Microsoft.AspNetCore.Components;

namespace AutoPerf;

internal static class Characterization
{
    public static async Task RunAsync()
    {
        var records = new List<object>();
        await using (var scenario = await TempDataScenario.CreateAsync())
        {
            var collection = (ICollection<KeyValuePair<string, object?>>)scenario.Data;
            Evidence.Require(scenario.Logs.LoadEvents == 0, "Actual public capture must preserve lazy loading.");
            var first = collection.Remove(new("Missing", null));
            var second = collection.Remove(new("MISSING", null));
            Evidence.Require(!first && !second && scenario.Logs.LoadEvents == 1, "First real Remove must invoke the actual cookie provider once.");
            records.Add(new { name = "cold-real-provider", first, second, actualProviderEvents = scenario.Logs.Snapshot() });
        }
        await using (var scenario = await TempDataScenario.CreateAsync())
        {
            var data = scenario.Data;
            var collection = (ICollection<KeyValuePair<string, object?>>)data;
            var cases = new (string Name, string Key, object? Value, bool Expected)[]
            {
                ("match-distinct-equal-string", "Message", new string("hello".AsSpan()), true),
                ("case-insensitive-key", "MESSAGE", "hello", true),
                ("case-sensitive-value", "Message", "HELLO", false),
                ("nonnull-versus-null", "Message", null, false),
                ("present-null", "Null", null, true),
                ("null-versus-nonnull", "Null", "hello", false),
                ("missing-null", "Missing", null, false),
                ("missing-nonnull", "Missing", "hello", false),
                ("ordinal-ascii-case", "I", 17, true),
                ("ordinal-not-turkish-dotted-i", "\u0130", 17, false),
            };
            foreach (var item in cases)
            {
                data.Clear();
                data["Message"] = new string("hello".AsSpan());
                data["Null"] = null;
                data["i"] = 17;
                var result = collection.Remove(new(item.Key, item.Value));
                var second = collection.Remove(new(item.Key, item.Value));
                Evidence.Require(result == item.Expected && !second && data.Count == (item.Expected ? 2 : 3) &&
                    scenario.Logs.LoadEvents == 1, "Actual conditional-removal semantics mismatch: " + item.Name);
                var remaining = data.Keys.Order(StringComparer.Ordinal)
                    .Select(key => new { key, value = data.Peek(key) }).ToArray();
                records.Add(new { name = item.Name, actualResult = result, actualSecondResult = second,
                    actualCount = data.Count, actualRemaining = remaining, actualProviderLoads = scenario.Logs.LoadEvents });
            }
            var invalid = ExpectedException<ArgumentNullException>(() => collection.Remove(new(null!, null)));
            Evidence.Require(invalid.ParamName == "key", "Actual invalid-key parameter contract changed.");
            records.Add(new { name = "null-key-error", actualType = invalid.GetType().FullName, invalid.ParamName });
        }
        await using (var scenario = await TempDataScenario.CreateAsync())
        {
            var data = scenario.Data;
            var collection = (ICollection<KeyValuePair<string, object?>>)data;
            var token = new object();
            var equality = new RecordingEquality(token);
            data["Message"] = equality;
            Evidence.Require(!collection.Remove(new("Missing", token)) && equality.Calls == 0, "Missing key must not call equality.");
            Evidence.Require(!collection.Remove(new("Message", new object())) && equality.Calls == 1 &&
                ReferenceEquals(data.Peek("Message"), equality), "Mismatch must run stored-value equality once without deletion.");
            Evidence.Require(collection.Remove(new("MESSAGE", token)) && equality.Calls == 2 &&
                !data.ContainsKey("Message"), "Match must run the same equality direction once and remove the key.");
            records.Add(new { name = "in-memory-only-asymmetric-value-equality", actualEqualityCalls = equality.Calls,
                actualUnsupportedPersistedUserTypeClaimed = false });

            var throwing = new ThrowingEquality();
            data["Message"] = throwing;
            var invalid = ExpectedException<InvalidOperationException>(() => collection.Remove(new("Message", token)));
            Evidence.Require(invalid.Message == "F040 expected equality failure" &&
                ReferenceEquals(data.Peek("Message"), throwing), "An equality exception must propagate before removal.");
            records.Add(new { name = "in-memory-only-throwing-value-equality", actualException = invalid.Message,
                actualKeyPreserved = true, actualUnsupportedPersistedUserTypeClaimed = false });

            equality = new RecordingEquality(token, () => data.Remove("Message"));
            data["Message"] = equality;
            var removed = collection.Remove(new("Message", token));
            Evidence.Require(!removed && equality.Calls == 1 && !data.ContainsKey("Message"),
                "The final actual Remove must return false after reentrant equality already removes the key.");
            records.Add(new { name = "in-memory-only-reentrant-removal", actualResult = removed,
                actualKeyRemains = false, actualEqualityCalls = equality.Calls, actualUnsupportedPersistedUserTypeClaimed = false });

            equality = new RecordingEquality(token, () => data["Message"] = "replacement");
            data["Message"] = equality;
            removed = collection.Remove(new("MESSAGE", token));
            Evidence.Require(removed && equality.Calls == 1 && !data.ContainsKey("Message"),
                "Matching reentrant replacement must be removed by the final actual Remove.");
            records.Add(new { name = "in-memory-only-reentrant-matching-replacement", actualResult = removed,
                actualKeyRemains = false, actualEqualityCalls = equality.Calls, actualUnsupportedPersistedUserTypeClaimed = false });

            equality = new RecordingEquality(token, () => data["Message"] = "replacement");
            data["Message"] = equality;
            removed = collection.Remove(new("MESSAGE", new object()));
            Evidence.Require(!removed && equality.Calls == 1 && Equals(data.Peek("Message"), "replacement"),
                "Nonmatching reentrant replacement must remain untouched by the outer removal.");
            records.Add(new { name = "in-memory-only-reentrant-nonmatching-replacement", actualResult = removed,
                actualValue = data.Peek("Message"), actualEqualityCalls = equality.Calls,
                actualUnsupportedPersistedUserTypeClaimed = false });
        }
        var profiles = new List<object>();
        foreach (var count in new[] { 0, 1, 8, 64 })
        {
            foreach (var length in new[] { 12, 128 })
            {
                foreach (var workload in Enum.GetValues<TempDataWorkload>())
                {
                    var benchmark = new TempDataRemoveBenchmarks { Count = count, KeyLength = length, Workload = workload };
                    benchmark.Setup();
                    var actual = new bool[16];
                    for (var index = 0; index < actual.Length; index++)
                    {
                        actual[index] = benchmark.RemoveAndRestore();
                        benchmark.ValidateRestoredState();
                    }
                    Evidence.Require(actual.All(value => value == benchmark.Expected),
                        "Every repeated real removal/restore must return the expected result, not only the first call.");
                    benchmark.Cleanup();
                    profiles.Add(new { profile = benchmark.Profile, actualExpected = benchmark.Expected,
                        actualCalls = actual.Length, actualResults = actual,
                        actualAdditionalSetupAndCleanupValidationCalls = 2,
                        actualRestoredCardinalityCheckedAfterEveryRepeatedCall = true,
                        actualNonemptyRestorationIncludedInTiming = true });
                }
            }
        }
        Evidence.Require(records.Count == 17 && profiles.Count == 40, "Require all seventeen semantic and forty lifecycle records.");
        var summary = new { actualAllPassed = true, actualSemanticRecords = records.Count, actualLifecycleProfiles = profiles.Count,
            actualCookiePersistenceClaimedByThisMemoryResponseHarness = false, records, profiles };
        File.WriteAllText(Path.Combine(Evidence.StateDirectory, "characterization.json"),
            JsonSerializer.Serialize(summary, new JsonSerializerOptions { WriteIndented = true }));
        Evidence.Write("characterization-completed", new { actualSemanticRecords = records.Count, actualLifecycleProfiles = profiles.Count });
    }

    private static T ExpectedException<T>(Action action) where T : Exception
    {
        try
        {
            action();
        }
        catch (T exception)
        {
            return exception;
        }

        throw new InvalidOperationException("Expected actual exception: " + typeof(T).Name);
    }

    private sealed class RecordingEquality(object expected, Action? action = null)
    {
        public int Calls { get; private set; }
        public override bool Equals(object? obj)
        {
            Calls++;
            action?.Invoke();

            return ReferenceEquals(expected, obj);
        }
        public override int GetHashCode() => 0;
    }

    private sealed class ThrowingEquality
    {
        public override bool Equals(object? obj) => throw new InvalidOperationException("F040 expected equality failure");
        public override int GetHashCode() => 0;
    }
}
