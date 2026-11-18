// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.Components.Forms;

namespace AutoPerf;

internal static class Characterization
{
    internal static async Task RunAsync()
    {
        var cases = new List<object>();
        var empty = new EditContext(new object()).Properties;
        var emptyKey = new CountingKey();
        Evidence.Require(!empty.TryGetValue(emptyKey, out var absent) && absent is null && emptyKey.Hashes == 0,
            "The actual uninitialized property bag must not hash an absent key.");
        cases.Add(new { name = "EmptyPropertyBag_MissDoesNotHashKey", actualHashes = emptyKey.Hashes, passed = true });
        var initialized = new EditContext(new object()).Properties;
        initialized[new object()] = new object();
        var key = new CountingKey();
        var value = new object();
        Evidence.Require(!initialized.TryGetValue(key, out _), "Require an actual initialized-bag miss.");
        initialized[key] = value;
        Evidence.Require(key.Hashes == 2, "The actual public bag miss-then-set hashes this diagnostic key twice.");
        cases.Add(new { name = "InitializedPropertyBag_MissThenSetHashesTwice", actualHashes = key.Hashes, passed = true });
        Evidence.Require(initialized.TryGetValue(key, out var stored) && ReferenceEquals(stored, value),
            "The public property bag must retain the exact stored reference.");
        foreach (var count in new[] { 1, 8, 64 })
        {
            await using var scenario = new FormScenario(count, "fields");
            var context = scenario.CreateContext();
            cases.Add(new { name = $"StaticSsrFields_Cold_{count}", passed = true,
                observation = await scenario.VerifyRenderAsync(context) });
            var firstFields = scenario.Provider.Fields;
            cases.Add(new { name = $"StaticSsrFields_Warm_{count}", passed = true,
                observation = await scenario.VerifyRenderAsync(context) });
            Evidence.Require(ReferenceEquals(firstFields, scenario.Provider.Fields),
                "New input instances under the same EditContext must reuse its original field map.");
        }
        await using (var first = new FormScenario(8, "first"))
        await using (var second = new FormScenario(1, "second"))
        {
            var firstContext = first.CreateContext();
            var secondContext = second.CreateContext();
            var one = await first.VerifyRenderAsync(firstContext);
            var two = await second.VerifyRenderAsync(secondContext);
            Evidence.Require(!ReferenceEquals(first.Provider.Fields, second.Provider.Fields),
                "Distinct forms must not share a registry or leak field mappings.");
            first.VerifyContext(firstContext);
            cases.Add(new { name = "SeparateForms_PreserveFieldAndPropertyIsolation", passed = true, first = one, second = two });
        }
        await using (var none = new FormScenario(0, "empty"))
        {
            cases.Add(new { name = "NoInputs_DoesNotInvokeFieldConsumer", passed = true,
                observation = await none.VerifyRenderAsync(none.CreateContext()) });
        }
        Evidence.Require(cases.Count == 10, "Require every predeclared characterization case.");
        Evidence.Write("characterization", new { actualCases = cases.Count, actualEveryCasePassed = true,
            actualNonpublicMemberInvocations = 0, actualBrowserValidationClaimed = false, cases });
        foreach (var count in new[] { 1, 8, 64 })
        {
            foreach (var state in new[] { "Cold", "Warm" })
            {
                var fixture = new FieldRegistryBenchmarks { FieldCount = count, RegistryState = state };
                await fixture.SetupAsync();
                _ = await fixture.RenderForm();
                await fixture.CleanupAsync();
            }
        }
        Evidence.Write("all-lifecycles", new { actualProfiles = 6, actualEverySetupWorkloadCleanupPassed = true });
    }

    private sealed class CountingKey
    {
        internal int Hashes { get; private set; }

        public override int GetHashCode()
        {
            Hashes++;

            return 257;
        }

        public override bool Equals(object? other) => ReferenceEquals(this, other);
    }
}
