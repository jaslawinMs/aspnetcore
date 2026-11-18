// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson;

namespace AutoPerf;

internal static class Characterization
{
    internal static void Run()
    {
        var cases = new List<object>();
        var objects = new Dictionary<string, object?> { ["Value"] = 1, ["Sentinel"] = "untouched" };
        var parsed = ReplaceScenario.Parse("""[{"op":"replace","path":"/Value","value":42}]""");
        Evidence.Require(parsed.Operations.Single().value is JsonElement, "Observe the real parsed operation representation.");
        parsed.ApplyTo(objects);
        Evidence.Require(objects["Value"] is JsonElement element && element.GetInt32() == 42
            && objects.Count == 2 && Equals(objects["Sentinel"], "untouched"), "Parsed object replacement must retain its actual value and sentinel.");
        cases.Add(new { name = "ParsedObjectExisting_UsesActualJsonElementAndPreservesOtherEntry", passed = true, actualInputType = parsed.Operations[0].value.GetType().FullName });

        foreach (var profile in new[] { "ProgrammaticIntExisting", "ParsedIntExisting" })
        {
            var scenario = new ReplaceScenario(1, profile);
            scenario.Verify();
            cases.Add(new { name = profile + "_ReplacesWith42", passed = true, actualInputType = scenario.InputRepresentation });
        }

        var typedConverter = new PayloadConverter(rejectUse: true);
        var typedOptions = Options(typedConverter);
        var expected = new Payload(42);
        var references = new Dictionary<string, Payload?> { ["Value"] = new(1), ["Sentinel"] = new(7) };
        new JsonPatchDocument { SerializerOptions = typedOptions }.Replace("/Value", expected).ApplyTo(references);
        Evidence.Require(ReferenceEquals(references["Value"], expected) && typedConverter.ReadCalls == 0
            && typedConverter.WriteCalls == 0 && references["Sentinel"]?.Value == 7, "An already-typed reference must retain identity without consulting its converter.");
        cases.Add(new { name = "AlreadyTypedReference_PreservesIdentityAndSkipsRegisteredConverter", passed = true, typedConverter.ReadCalls, typedConverter.WriteCalls });

        references["Value"] = null;
        new JsonPatchDocument { SerializerOptions = typedOptions }.Replace("/Value", expected).ApplyTo(references);
        Evidence.Require(ReferenceEquals(references["Value"], expected) && references.Count == 2, "An existing null value is not a missing dictionary slot.");
        cases.Add(new { name = "ExistingNullSlot_ReceivesAssignableReference", passed = true });

        var missingConverter = new PayloadConverter(rejectUse: true);
        var absent = new Dictionary<string, Payload> { ["Sentinel"] = new(7) };
        var missingPatch = ReplaceScenario.Parse("""[{"op":"replace","path":"/Value","value":42}]""", Options(missingConverter));
        var errors = new List<JsonPatchError>();
        missingPatch.ApplyTo(absent, errors.Add);
        Evidence.Require(errors.Count == 1 && errors[0].ErrorMessage == Missing && absent.Count == 1
            && absent["Sentinel"].Value == 7 && missingConverter.ReadCalls == 0 && missingConverter.WriteCalls == 0,
            "A missing key must reject before any registered value converter.");
        cases.Add(new { name = "MissingKey_ReportsPathErrorBeforeConverterAndPreservesData", passed = true, error = errors[0].ErrorMessage });

        foreach (var clear in new[] { false, true })
        {
            var dictionary = new Dictionary<string, Payload> { ["Value"] = new(1), ["OriginalOther"] = new(7) };
            var capacityBefore = dictionary.EnsureCapacity(0);
            var survivor = new Payload(-1);
            var sawOriginalKey = false;
            var converter = new PayloadConverter(() =>
            {
                sawOriginalKey = dictionary["Value"].Value == 1;
                if (clear)
                {
                    dictionary.Clear();
                    dictionary.Add("Survivor", survivor);
                }
                else
                {
                    for (var index = 0; index < 128; index++)
                    {
                        dictionary.Add($"Added{index}", new Payload(index));
                    }
                }
            });
            var patch = ReplaceScenario.Parse("""[{"op":"replace","path":"/Value","value":42}]""", Options(converter));
            Evidence.Require(converter.ReadCalls == 0 && converter.WriteCalls == 0, "Patch parsing must not fabricate a value-converter invocation.");
            patch.ApplyTo(dictionary);
            Evidence.Require(sawOriginalKey && converter.ReadCalls == 1 && converter.WriteCalls == 0
                && dictionary["Value"].Value == 42, "The actual converter must run once between existence checking and material replacement.");
            if (clear)
            {
                Evidence.Require(dictionary.Count == 2 && ReferenceEquals(dictionary["Survivor"], survivor),
                    "After a converter clears/inserts, final replacement must re-add Value without corrupting Survivor.");
            }
            else
            {
                Evidence.Require(dictionary.Count == 130 && dictionary.EnsureCapacity(0) > capacityBefore
                    && dictionary["OriginalOther"].Value == 7 && dictionary["Added127"].Value == 127,
                    "Final replacement must target the resized dictionary and preserve both old and newly inserted entries.");
            }
            cases.Add(new { name = clear ? "ActualConverterClear_ReaddsTargetAndPreservesInsertedReference" : "ActualConverterResize_ReplacesCurrentStorageAndPreservesEntries",
                passed = true, converter.ReadCalls, actualFinalCount = dictionary.Count, actualCapacityBefore = capacityBefore, actualCapacityAfter = dictionary.EnsureCapacity(0) });
        }

        var integers = new Dictionary<string, int> { ["Value"] = 1 };
        errors.Clear();
        new JsonPatchDocument().Replace("/Value", "not-an-int").ApplyTo(integers, errors.Add);
        Evidence.Require(errors.Count == 1 && errors[0].ErrorMessage == "The value 'not-an-int' is invalid for target location."
            && integers["Value"] == 1 && integers.Count == 1, "Conversion failure must keep the original value and exact error.");
        cases.Add(new { name = "InvalidValue_KeepsOldValueAndReportsConversionError", passed = true, error = errors[0].ErrorMessage });

        objects = new() { ["Value"] = 1 };
        new JsonPatchDocument().Replace("/Value", null).ApplyTo(objects);
        Evidence.Require(objects.Count == 1 && objects.ContainsKey("Value") && objects["Value"] is null, "A null reference replacement must retain the key.");
        cases.Add(new { name = "NullReplacement_KeepsExistingKeyWithNullValue", passed = true });

        var nullable = new Dictionary<string, int?> { ["Value"] = null };
        new JsonPatchDocument().Replace("/Value", 42).ApplyTo(nullable);
        Evidence.Require(nullable["Value"] == 42 && nullable.Count == 1, "A boxed nullable-compatible value must replace an existing null slot.");
        cases.Add(new { name = "BoxedNullableCompatibleValue_ReplacesExistingNull", passed = true });

        var insensitive = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase) { ["Value"] = 1 };
        new JsonPatchDocument().Replace("/value", 42).ApplyTo(insensitive);
        Evidence.Require(insensitive.Count == 1 && insensitive["Value"] == 42 && insensitive.Keys.Single() == "Value",
            "Replacement must honor the actual key comparer without changing the existing key spelling.");
        cases.Add(new { name = "OrdinalIgnoreCaseKey_PreservesOriginalKeyAndValue", passed = true });

        var empty = new Dictionary<string, object?>();
        errors.Clear();
        parsed.ApplyTo(empty, errors.Add);
        Evidence.Require(empty.Count == 0 && errors.Count == 1 && errors[0].ErrorMessage == Missing, "An empty dictionary has no writable existing slot.");
        cases.Add(new { name = "EmptyDictionary_ReportsMissingWithoutAddingValue", passed = true });

        var invalidKeyConverter = new PayloadConverter(rejectUse: true);
        var intKeys = new Dictionary<int, Payload> { [1] = new(7) };
        errors.Clear();
        ReplaceScenario.Parse("""[{"op":"replace","path":"/invalid","value":42}]""", Options(invalidKeyConverter)).ApplyTo(intKeys, errors.Add);
        Evidence.Require(errors.Count == 1 && errors[0].ErrorMessage == "The provided path segment 'invalid' cannot be converted to the target type."
            && intKeys.Count == 1 && intKeys[1].Value == 7 && invalidKeyConverter.ReadCalls == 0 && invalidKeyConverter.WriteCalls == 0,
            "Invalid key conversion must happen before any value conversion or write.");
        cases.Add(new { name = "InvalidKey_RejectsBeforeValueConversionAndPreservesData", passed = true });

        var derived = new DerivedDictionary { ["Value"] = 1 };
        errors.Clear();
        parsed.ApplyTo(derived, errors.Add);
        Evidence.Require(errors.Count == 1 && derived["Value"] == 1 && derived.Count == 1,
            "The real default factory must not silently treat an arbitrary derived Dictionary as its exact Dictionary adapter path.");
        cases.Add(new { name = "DerivedDictionary_DefaultFactoryDoesNotUseExactDictionaryReplacement", passed = true, actualError = errors[0].ErrorMessage });

        errors.Clear();
        new JsonPatchDocument().Replace("/Value", null).ApplyTo(integers, errors.Add);
        Evidence.Require(errors.Count == 1 && integers["Value"] == 1 && integers.Count == 1,
            "Null must not become a successful non-nullable replacement.");
        cases.Add(new { name = "NullToNonNullable_RejectsAndPreservesOldValue", passed = true, actualError = errors[0].ErrorMessage });

        Evidence.Require(cases.Count == 16, "Require every independently predeclared characterization case.");
        Evidence.Write("characterization", new { actualCases = cases.Count, actualEveryCasePassed = true,
            actualDefaultPublicProducerUsed = true, actualPrivateAdapterOrCallbackInjection = false, cases });
        var lifecycles = new List<object>();
        foreach (var count in new[] { 1, 64 })
        {
            foreach (var profile in new[] { "ParsedObjectExisting", "ProgrammaticIntExisting", "ParsedIntExisting",
                "ParsedObjectMissing", "ProgrammaticNullExisting", "ParsedObjectTestControl" })
            {
                var fixture = new DictionaryReplaceBenchmarks { Count = count, Profile = profile };
                fixture.Setup();
                _ = fixture.ApplyAndObserve();
                fixture.Cleanup();
                lifecycles.Add(new { count, profile, passed = true });
            }
        }
        Evidence.Write("all-lifecycles", new { actualProfiles = 12, actualEverySetupWorkloadCleanupPassed = true, lifecycles });
    }

    private const string Missing = "The target location specified by path segment 'Value' was not found.";

    private static JsonSerializerOptions Options(PayloadConverter converter)
    {
        var options = new JsonSerializerOptions();
        options.Converters.Add(converter);

        return options;
    }

    private sealed record Payload(int Value);
    private sealed class DerivedDictionary : Dictionary<string, int>
    {
    }

    private sealed class PayloadConverter(Action? mutate = null, bool rejectUse = false) : JsonConverter<Payload>
    {
        internal int ReadCalls { get; private set; }
        internal int WriteCalls { get; private set; }

        public override Payload Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            ReadCalls++;
            Evidence.Require(!rejectUse, "The registered value converter must not be used by this operation.");
            var number = reader.GetInt32();
            mutate?.Invoke();

            return new Payload(number);
        }

        public override void Write(Utf8JsonWriter writer, Payload value, JsonSerializerOptions options)
        {
            WriteCalls++;
            Evidence.Require(!rejectUse, "The registered value converter must not be used by this operation.");
            writer.WriteNumberValue(value.Value);
        }
    }
}
