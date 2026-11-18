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
            var first = collection.Contains(new("Missing", null));
            var second = collection.Contains(new("MISSING", null));
            Evidence.Require(!first && !second && scenario.Logs.LoadEvents == 1, "First real Contains must invoke the actual cookie provider once.");
            records.Add(new { name = "cold-real-provider", first, second, actualProviderEvents = scenario.Logs.Snapshot() });
        }
        await using (var scenario = await TempDataScenario.CreateAsync())
        {
            var data = scenario.Data;
            var collection = (ICollection<KeyValuePair<string, object?>>)data;
            data["Message"] = new string("hello".AsSpan());
            data["Null"] = null;
            data["i"] = 17;
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
                var result = collection.Contains(new(item.Key, item.Value));
                Evidence.Require(result == item.Expected && data.Count == 3 && scenario.Logs.LoadEvents == 1,
                    "Actual containment semantic mismatch: " + item.Name);
                records.Add(new { name = item.Name, actualResult = result, actualCount = data.Count,
                    actualValue = data.Peek("Message"), actualProviderLoads = scenario.Logs.LoadEvents });
            }
            var invalid = ExpectedException<ArgumentNullException>(() => collection.Contains(new(null!, null)));
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
            Evidence.Require(!collection.Contains(new("Missing", token)) && equality.Calls == 0, "Missing key must not call value equality.");
            Evidence.Require(collection.Contains(new("MESSAGE", token)) && equality.Calls == 1, "Stored value equality must run once in the same direction.");
            Evidence.Require(!collection.Contains(new("Message", new object())) && equality.Calls == 2, "Mismatched value equality must run once.");
            records.Add(new { name = "in-memory-only-asymmetric-value-equality", actualEqualityCalls = equality.Calls,
                actualUnsupportedPersistedUserTypeClaimed = false });
            data["Message"] = new ThrowingEquality();
            var invalid = ExpectedException<InvalidOperationException>(() => collection.Contains(new("Message", token)));
            Evidence.Require(invalid.Message == "F039 expected equality failure", "Do not swallow or replace actual equality exceptions.");
            records.Add(new { name = "in-memory-only-throwing-value-equality", actualException = invalid.Message,
                actualUnsupportedPersistedUserTypeClaimed = false });
            data["Message"] = new RecordingEquality(token, () => data.Remove("Message"));
            Evidence.Require(collection.Contains(new("Message", token)) && !data.ContainsKey("Message"),
                "Reentrant equality must observe the same already-retrieved value and actual removal.");
            records.Add(new { name = "in-memory-only-reentrant-value-equality", actualResult = true, actualKeyRemains = false,
                actualUnsupportedPersistedUserTypeClaimed = false });
        }
        var profiles = new List<object>();
        foreach (var count in new[] { 0, 1, 8, 64 })
        {
            foreach (var length in new[] { 12, 128 })
            {
                foreach (var workload in Enum.GetValues<TempDataWorkload>())
                {
                    var benchmark = new TempDataContainsBenchmarks { Count = count, KeyLength = length, Workload = workload };
                    benchmark.Setup();
                    var actual = new bool[16];
                    for (var index = 0; index < actual.Length; index++)
                    {
                        actual[index] = benchmark.Contains();
                    }
                    Evidence.Require(actual.All(value => value == benchmark.Expected), "All repeated prepared real calls must produce the declared result.");
                    benchmark.Cleanup();
                    profiles.Add(new { profile = benchmark.Profile, actualExpected = benchmark.Expected,
                        actualCalls = actual.Length, actualResults = actual });
                }
            }
        }
        Evidence.Require(records.Count == 15 && profiles.Count == 40, "Require all declared actual semantic and lifecycle records.");
        var result = new { actualAllPassed = true, actualSemanticRecords = records.Count, actualLifecycleProfiles = profiles.Count,
            actualCookiePersistenceClaimedByThisMemoryResponseHarness = false, records, profiles };
        File.WriteAllText(Path.Combine(Evidence.StateDirectory, "characterization.json"),
            JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
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
        public override bool Equals(object? obj) => throw new InvalidOperationException("F039 expected equality failure");
        public override int GetHashCode() => 0;
    }
}
