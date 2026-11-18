// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.Mvc.Razor;

namespace AutoPerf;

internal static class Characterization
{
    internal static void Run()
    {
        var contracts = VerifyContracts();
        foreach (var spec in RegistrationSpec.All)
        {
            using var scenario = new RegistrationScenario(spec);
            Evidence.Write("compiled-producer-and-rendering", scenario.Verify());
        }
        Evidence.Write("public-contracts", new { actualCases = contracts.Count, actualPassed = contracts });
        Evidence.Write("adjacent-bcl-diagnostics", VerifyAdjacentBcl());
        Evidence.Write("characterization-completed", new
        {
            actualContractCases = contracts.Count,
            actualCompiledProducerProfiles = RegistrationSpec.All.Length,
            actualRegistrationAndFullViewBoundaries = RegistrationSpec.All.Length * 2,
            actualTimingPerformed = false
        });
    }

    private static List<string> VerifyContracts()
    {
        var passed = new List<string>();
        var invoked = 0;
        RenderAsyncDelegate original = () =>
        {
            invoked++;
            return Task.CompletedTask;
        };
        RenderAsyncDelegate replacement = () => throw new InvalidOperationException("A rejected section must never be invoked.");
        foreach (var duplicate in new[] { "Scripts", "scripts", "SCRIPTS" })
        {
            var page = new ProbePage();
            page.DefineSection("Scripts", original);
            try
            {
                page.DefineSection(duplicate, replacement);
                throw new InvalidOperationException("A duplicate section was accepted.");
            }
            catch (InvalidOperationException exception) when (exception.Message == $"Section '{duplicate}' is already defined.")
            {
            }
            var only = page.SectionWriters.Single();
            Evidence.Require(only.Key == "Scripts" && ReferenceEquals(only.Value, original) && invoked == 0,
                "A duplicate changed key spelling, original delegate, count or registration deferral.");
            passed.Add("Duplicate-" + duplicate);
        }
        var empty = new ProbePage();
        empty.DefineSection(string.Empty, original);
        Evidence.Require(empty.SectionWriters.Count == 1 && ReferenceEquals(empty.SectionWriters[string.Empty], original) && invoked == 0,
            "The supported empty section name or delegate identity changed.");
        passed.Add("EmptyName");

        var nullEntry = new ProbePage();
        nullEntry.SectionWriters.Add("Scripts", null!);
        try
        {
            nullEntry.DefineSection("SCRIPTS", original);
            throw new InvalidOperationException("An existing null-valued key was mistaken for a missing section.");
        }
        catch (InvalidOperationException exception) when (exception.Message == "Section 'SCRIPTS' is already defined.")
        {
        }
        Evidence.Require(nullEntry.SectionWriters.Count == 1 && nullEntry.SectionWriters["Scripts"] is null && invoked == 0,
            "Rejected registration overwrote an externally populated null-valued slot.");
        passed.Add("ExistingNullValuedSlot");

        foreach (var item in new (string Case, string Name, RenderAsyncDelegate Section, string Parameter, bool Existing)[]
        {
            ("NullName", null!, original, "name", false),
            ("NullSection", "Scripts", null!, "section", false),
            ("BothNull", null!, null!, "name", false),
            ("DuplicateAndNullSection", "scripts", null!, "section", true)
        })
        {
            var page = new ProbePage();
            if (item.Existing)
            {
                page.DefineSection("Scripts", original);
            }
            try
            {
                page.DefineSection(item.Name, item.Section);
                throw new InvalidOperationException("Invalid section arguments were accepted.");
            }
            catch (ArgumentNullException exception) when (exception.ParamName == item.Parameter && exception.InnerException is null)
            {
            }
            Evidence.Require(page.SectionWriters.Count == (item.Existing ? 1 : 0) && invoked == 0
                && (!item.Existing || ReferenceEquals(page.SectionWriters["Scripts"], original)),
                "Argument rejection changed the store or invoked a section.");
            passed.Add(item.Case);
        }

        var legacy = new ProbePage();
        object? receivedWriter = new object();
        var legacyInvocations = 0;
        legacy.RegisterLegacy("Legacy", writer =>
        {
            receivedWriter = writer;
            legacyInvocations++;
            return Task.CompletedTask;
        });
        Evidence.Require(legacyInvocations == 0 && legacy.SectionWriters.Count == 1,
            "The protected legacy editor overload must defer its callback.");
        legacy.SectionWriters["LEGACY"]().GetAwaiter().GetResult();
        Evidence.Require(legacyInvocations == 1 && receivedWriter is null,
            "The protected legacy adapter must retain case-insensitive lookup and pass its original null writer.");
        passed.Add("LegacyEditorOverloadDefersAndPassesNull");

        return passed;
    }

    private static object VerifyAdjacentBcl()
    {
        var observations = new List<object>();
        foreach (var populated in new[] { false, true })
        {
            foreach (var operation in new[] { "OriginalInterfaceContainsIndexer", "InterfaceExtensionTryAdd", "ConcreteDictionaryTryAdd" })
            {
                var comparer = new CountingComparer();
                var dictionary = new Dictionary<string, RenderAsyncDelegate>(comparer);
                if (populated)
                {
                    dictionary.Add("Existing", static () => Task.CompletedTask);
                }
                comparer.HashCalls = 0;
                IDictionary<string, RenderAsyncDelegate> exposed = dictionary;
                RenderAsyncDelegate callback = static () => Task.CompletedTask;
                var added = false;
                switch (operation)
                {
                    case "OriginalInterfaceContainsIndexer":
                        if (!exposed.ContainsKey("Added"))
                        {
                            exposed["Added"] = callback;
                            added = true;
                        }
                        break;
                    case "InterfaceExtensionTryAdd":
                        added = exposed.TryAdd("Added", callback);
                        break;
                    case "ConcreteDictionaryTryAdd":
                        added = dictionary.TryAdd("Added", callback);
                        break;
                }
                var hashCalls = comparer.HashCalls;
                Evidence.Require(added && dictionary.Count == (populated ? 2 : 1)
                    && ReferenceEquals(dictionary["Added"], callback), "Adjacent BCL registration semantics differ.");
                observations.Add(new { populated, operation, actualHashCallsBeforeReadback = hashCalls });
            }
        }

        return new
        {
            boundary = "Untimed target-runtime BCL dictionaries with an owned counting comparer; not instrumentation of RazorPageBase's fixed production comparer.",
            actualTimingPerformed = false,
            actualProductionRazorHashCountClaimed = false,
            observations
        };
    }

    private sealed class ProbePage : RazorPageBase
    {
        public override Task ExecuteAsync() => Task.CompletedTask;

        public override void BeginContext(int position, int length, bool isLiteral)
        {
        }

        public override void EndContext()
        {
        }

        public override void EnsureRenderedBodyOrSections()
            => throw new InvalidOperationException("The direct-base contract probe must never be used as a layout.");

        internal void RegisterLegacy(string name, Func<object?, Task> section) => DefineSection(name, section);
    }

    private sealed class CountingComparer : IEqualityComparer<string>
    {
        internal int HashCalls { get; set; }

        public bool Equals(string? left, string? right) => StringComparer.OrdinalIgnoreCase.Equals(left, right);

        public int GetHashCode(string value)
        {
            HashCalls++;

            return StringComparer.OrdinalIgnoreCase.GetHashCode(value);
        }
    }
}
