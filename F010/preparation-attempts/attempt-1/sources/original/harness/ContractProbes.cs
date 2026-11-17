using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoPerf;

internal static class ContractProbes
{
    internal static async Task<int> Run(Action<ProbeRecord> observe)
    {
        var count = 0;
        async Task<ProbeRecord> Check(string name, ClaimScenario fixture, bool expected, string note = "")
        {
            var record = fixture.Observe(name, await fixture.Authorize(), expected, note);
            count++;

            return record;
        }
        foreach (var shape in (Shape[])Enum.GetValues(typeof(Shape)))
        {
            using var fixture = ClaimSamples.Create(shape);
            var record = await Check("sample-" + shape, fixture, fixture.Expected,
                "Actual public builder/registered service/dispatch;14 unrelated prefix claims;Params2/NoValues have2 permission claims,Set1 has1,others16.");
            if (fixture.Allowed is HashSet<string> set && set.GetType() == typeof(HashSet<string>))
            {
                if (shape == Shape.Ignore64)
                {
                    record.NativeSetContains = set.Contains("VALUE063");
                    SharedProof.Require(record.NativeSetContains == true && !record.KnownOrdinalComparer && !record.KnownDefaultComparer,
                        "Actual non-Ordinal set precondition not reached.");
                }
                else
                {
                    SharedProof.Require(record.KnownOrdinalComparer || record.KnownDefaultComparer, "Actual known-comparer set precondition not reached.");
                }
            }
            observe(record);
        }
        foreach (var comparer in new IEqualityComparer<string>[] { StringComparer.Ordinal, EqualityComparer<string>.Default })
        {
            var label = ReferenceEquals(comparer, StringComparer.Ordinal) ? "ordinal" : "default";
            var values = new HashSet<string>(new[] { "read" }, comparer);
            using var fixture = new ClaimScenario(values, ClaimSamples.Principal("write"), expected: false);
            observe(await Check(label + "-live-before-add", fixture, false));
            values.Add("write");
            observe(await Check(label + "-live-after-add", fixture, true));
            values.Remove("write");
            observe(await Check(label + "-live-after-remove", fixture, false));
            values.Clear();
            observe(await Check(label + "-nonempty-then-empty", fixture, false,
                "Captured constructor flag remains restricted after clearing;not a per-call empty-list reinterpretation."));
            var initiallyEmpty = new HashSet<string>(comparer);
            using var emptyFixture = new ClaimScenario(initiallyEmpty, ClaimSamples.Principal("not-allowed"), expected: true);
            initiallyEmpty.Add("unrelated");
            observe(await Check(label + "-empty-then-nonempty", emptyFixture, true,
                "Current empty-at-construction behavior intentionally preserved,not silently tightened."));
        }
        var array = new[] { "read" };
        using (var fixture = new ClaimScenario(array, ClaimSamples.Principal("write"), expected: false, useParams: true))
        {
            observe(await Check("array-before-replace", fixture, false));
            array[0] = "write";
            observe(await Check("array-same-count-replace", fixture, true));
        }
        var list = new List<string> { "read" };
        using (var fixture = new ClaimScenario(list.AsReadOnly(), ClaimSamples.Principal("write"), expected: false))
        {
            observe(await Check("readonly-before-replace", fixture, false));
            list[0] = "write";
            observe(await Check("readonly-live-backing", fixture, true));
        }
        var backing = new List<string> { "read" };
        var deferred = new LiveEnumerable(backing);
        using (var fixture = new ClaimScenario(deferred, ClaimSamples.Principal("write"), expected: false))
        {
            SharedProof.Require(deferred.Enumerations == 1, "Actual constructor Any must enumerate deferred source exactly once.");
            deferred.Enumerations = 0;
            var first = await Check("deferred-before-mutation", fixture, false);
            first.ActualSourceEnumerations = deferred.Enumerations;
            SharedProof.Require(deferred.Enumerations == 1, "Actual first deferred membership enumeration not observed.");
            observe(first);
            backing[0] = "write";
            var second = await Check("deferred-after-mutation", fixture, true);
            second.ActualSourceEnumerations = deferred.Enumerations;
            SharedProof.Require(deferred.Enumerations == 2, "Actual live/deferred second membership enumeration not observed.");
            observe(second);
            fixture.User = ClaimSamples.Principal("write", "unrelated");
            var third = await Check("type-miss-skips-values", fixture, false);
            third.ActualSourceEnumerations = deferred.Enumerations;
            SharedProof.Require(deferred.Enumerations == 2, "Unrelated claim type unexpectedly touched value producer.");
            observe(third);
        }
        var custom = new PretendingComparer();
        var customSet = new HashSet<string>(new[] { "write" }, custom);
        var nativeCustomContains = customSet.Contains("WRITE");
        using (var fixture = new ClaimScenario(customSet, ClaimSamples.Principal("WRITE"), expected: false))
        {
            custom.Calls = 0;
            var record = await Check("custom-comparer-must-not-run", fixture, false,
                "Custom comparer folds case and claims Object.Equals(anything)==true;explicit Ordinal fallback must ignore it.");
            record.NativeSetContains = nativeCustomContains;
            SharedProof.Require(nativeCustomContains && custom.Calls == 0, "Actual custom comparer was invoked or divergent precondition absent.");
            observe(record);
        }
        var derived = new ReimplementedSet();
        var nativeDerivedContains = derived.Contains("storage");
        using (var fixture = new ClaimScenario(derived, ClaimSamples.Principal("storage"), expected: false))
        {
            derived.Enumerations = 0;
            var first = await Check("derived-set-storage-hidden", fixture, false);
            first.NativeSetContains = nativeDerivedContains;
            first.ActualSourceEnumerations = derived.Enumerations;
            SharedProof.Require(nativeDerivedContains && derived.Enumerations == 1, "Actual reimplemented generic enumeration not used.");
            observe(first);
            fixture.User = ClaimSamples.Principal("visible");
            var second = await Check("derived-set-visible-enumeration", fixture, true);
            second.ActualSourceEnumerations = derived.Enumerations;
            SharedProof.Require(derived.Enumerations == 2, "Actual second derived enumeration not used.");
            observe(second);
        }
        var poison = new PoisonEnumerable();
        using (var fixture = new ClaimScenario(poison, ClaimSamples.Principal("write"), expected: true))
        {
            var first = await Check("deferred-short-circuit", fixture, true,
                "Real yield producer returns one value then throws;constructor Any and matching request must stop before throw.");
            first.ActualProducerThrows = poison.Throws;
            first.ActualSourceEnumerations = poison.Enumerations;
            SharedProof.Require(poison.Throws == 0 && poison.Enumerations == 2, "Short-circuit producer behavior differs.");
            observe(first);
            fixture.User = ClaimSamples.Principal("missing");
            try
            {
                await fixture.Authorize();
                throw new InvalidOperationException("Actual missing-value request must reach the producer exception.");
            }
            catch (ProducerException)
            {
                SharedProof.Require(poison.Throws == 1 && poison.Enumerations == 3, "Actual owning deferred throw not observed.");
                count++;
                observe(new ProbeRecord
                {
                    Name = "deferred-original-exception-propagates", Expected = false, Observed = false,
                    ServiceType = fixture.Service.GetType().FullName!, PrincipalType = fixture.User.GetType().FullName!,
                    InputType = poison.GetType().FullName!, RetainedAllowedValuesIdentity = ReferenceEquals(fixture.Requirement.AllowedValues, poison),
                    ActualProducerThrows = poison.Throws, ActualSourceEnumerations = poison.Enumerations,
                    Note = "Actual ProducerException from second yield step propagated through real registered service;false fields mean no success result,not a manufactured failed AuthorizationResult."
                });
            }
        }
        using (var fixture = new ClaimScenario(new[] { "write" }, ClaimSamples.Principal("write", "pErMiSsIoN"), expected: true))
        {
            observe(await Check("claim-type-case-insensitive", fixture, true));
        }
        using (var fixture = new ClaimScenario(new[] { "write" }, ClaimSamples.Principal("WRITE"), expected: false))
        {
            observe(await Check("allowed-values-case-sensitive", fixture, false));
        }
        var principal = new OverridingPrincipal();
        using (var fixture = new ClaimScenario(new[] { "write" }, principal, expected: false))
        {
            var record = await Check("principal-override-honored", fixture, false);
            record.ActualSourceEnumerations = principal.Accesses;
            SharedProof.Require(principal.Accesses > 0, "Actual overridden principal Claims producer not called.");
            observe(record);
        }
        var identity = new OverridingIdentity();
        using (var fixture = new ClaimScenario(new[] { "write" }, new ClaimsPrincipal(identity), expected: true))
        {
            var record = await Check("identity-override-honored", fixture, true);
            record.ActualSourceEnumerations = identity.Accesses;
            SharedProof.Require(identity.Accesses > 0, "Actual overridden identity Claims producer not called.");
            observe(record);
        }
        var multi = new ClaimsPrincipal();
        multi.AddIdentity(new ClaimsIdentity(new[] { new Claim("unrelated", "write") }));
        multi.AddIdentity(new ClaimsIdentity());
        multi.AddIdentity(new ClaimsIdentity(new[] { new Claim("permission", "write") }));
        using (var fixture = new ClaimScenario(new[] { "write" }, multi, expected: true))
        {
            observe(await Check("all-identities-search", fixture, true));
        }
        using (var fixture = new ClaimScenario(new[] { "read", "write" }, ClaimSamples.Principal("write"), expected: true))
        {
            SharedProof.Require(fixture.Requirement.ToString() ==
                "ClaimsAuthorizationRequirement:Claim.Type=Permission and Claim.Value is one of the following values: (read|write)",
                "Actual current public ToString changed.");
            observe(await Check("existing-tostring-and-identity", fixture, true));
        }

        return count;
    }

    private sealed class LiveEnumerable(List<string> source) : IEnumerable<string>
    {
        internal int Enumerations;
        public IEnumerator<string> GetEnumerator()
        {
            Enumerations++;

            return source.GetEnumerator();
        }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

    private sealed class PretendingComparer : IEqualityComparer<string>
    {
        internal int Calls;
        public bool Equals(string? left, string? right)
        {
            Calls++;

            return StringComparer.OrdinalIgnoreCase.Equals(left, right);
        }
        public int GetHashCode(string value)
        {
            Calls++;

            return StringComparer.OrdinalIgnoreCase.GetHashCode(value);
        }
        public override bool Equals(object? other)
        {
            Calls++;

            return true;
        }
        public override int GetHashCode() => 1;
    }

    private sealed class ReimplementedSet : HashSet<string>, IEnumerable<string>
    {
        internal int Enumerations;
        internal ReimplementedSet() : base(new[] { "storage" }, StringComparer.Ordinal) { }
        IEnumerator<string> IEnumerable<string>.GetEnumerator()
        {
            Enumerations++;

            return ((IEnumerable<string>)new[] { "visible" }).GetEnumerator();
        }
    }

    private sealed class ProducerException : Exception { }

    private sealed class PoisonEnumerable : IEnumerable<string>
    {
        internal int Throws;
        internal int Enumerations;
        public IEnumerator<string> GetEnumerator()
        {
            Enumerations++;
            yield return "write";
            Throws++;
            throw new ProducerException();
        }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

    private sealed class OverridingPrincipal() : ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("Permission", "write") }))
    {
        internal int Accesses;
        public override IEnumerable<Claim> Claims
        {
            get
            {
                Accesses++;

                return new[] { new Claim("unrelated", "write") };
            }
        }
    }

    private sealed class OverridingIdentity : ClaimsIdentity
    {
        internal int Accesses;
        public override IEnumerable<Claim> Claims
        {
            get
            {
                Accesses++;

                return new[] { new Claim("Permission", "write") };
            }
        }
    }
}
