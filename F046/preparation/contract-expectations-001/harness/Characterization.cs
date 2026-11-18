// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace AutoPerf;

internal static class Characterization
{
    internal static async Task RunAsync()
    {
        foreach (var owner in new[] { HeaderAccess.HttpSys, HeaderAccess.Iis })
        {
            IlWitness.Run(owner);
            Contracts(owner);
        }
        foreach (var profile in Enum.GetValues<ConnectionProfileKey>())
        {
            foreach (var control in new[] { false, true })
            {
                var headers = HeaderAccess.HttpSys.CreateFresh(profile);
                if (control)
                {
                    HeaderDictionaryExtensions.Append(headers, HeaderNames.Connection, "close");
                }
                else
                {
                    HeaderAccess.HttpSys.Append(headers, HeaderNames.Connection, "close");
                }
                var expected = HeaderAccess.InitialValues(profile).Concat(["close"]).ToArray();
                Evidence.Require(headers.Count == 2 && headers[HeaderNames.Connection].SequenceEqual(expected),
                    "Actual fresh header suffix output differs.");
                var originalKey = profile is ConnectionProfileKey.MixedCaseExisting ? "cOnNeCtIoN" : HeaderNames.Connection;
                Evidence.Require(headers.Keys.Contains(originalKey, StringComparer.Ordinal), "Actual original key spelling differs.");
                var operation = HeaderAccess.HttpSys.CompileFreshOperation(profile, control);
                Evidence.Require(operation() == 2, "Actual compiled benchmark lifecycle must execute its constructor and append.");
                Evidence.Write("fresh-append-boundary-characterized", new
                {
                    profile = profile.ToString(),
                    method = control ? nameof(HeaderAppendBenchmarks.FreshPublicExtensionControl) : nameof(HeaderAppendBenchmarks.FreshNativeAppend),
                    actualConnection = headers[HeaderNames.Connection].ToArray(),
                    actualCollectionCount = headers.Count,
                    actualAdapterCallsRealOwner = true,
                    actualCompiledOperationReturnedExpectedCount = true
                });
            }
        }
        await NativeProducer.RunAsync().ConfigureAwait(false);
    }

    private static void Contracts(HeaderAccess owner)
    {
        var completed = new List<string>();
        foreach (var existing in new[] { false, true })
        {
            var headers = owner.Create();
            if (existing)
            {
                headers["cOnNeCtIoN"] = new[] { "keep-alive", "upgrade" };
            }
            owner.Append(headers, HeaderNames.Connection, "close");
            Evidence.Require(headers.Count == 1 && headers[HeaderNames.Connection].SequenceEqual(
                existing ? ["keep-alive", "upgrade", "close"] : ["close"]), "Default concatenation order differs.");
            Evidence.Require(headers.Single().Key == (existing ? "cOnNeCtIoN" : HeaderNames.Connection), "Stored key spelling differs.");
            completed.Add(existing ? "Default.ExistingMixedCaseOrder" : "Default.Missing");
        }
        var nullHeaders = owner.Create();
        owner.Append(nullHeaders, HeaderNames.Connection, null);
        Evidence.Require(nullHeaders.Count == 1 && nullHeaders.ContainsKey("connection")
            && nullHeaders[HeaderNames.Connection].Count == 0, "Null-valued absent append must preserve an empty entry.");
        completed.Add("Default.NullCreatesPresentEmptyEntry");
        owner.Append(nullHeaders, HeaderNames.Connection, string.Empty);
        Evidence.Require(nullHeaders.Count == 1 && nullHeaders[HeaderNames.Connection].SequenceEqual([string.Empty]), "Empty value differs.");
        completed.Add("Default.EmptyValue");
        var sensitiveStore = new Dictionary<string, StringValues>(StringComparer.Ordinal) { ["connection"] = "keep-alive" };
        var sensitive = owner.Create(sensitiveStore);
        owner.Append(sensitive, HeaderNames.Connection, "close");
        Evidence.Require(sensitive.Count == 2 && sensitive["connection"] == "keep-alive"
            && sensitive[HeaderNames.Connection] == "close", "Exact custom dictionary comparer must remain in force.");
        completed.Add("ExactDictionary.OrdinalComparer");
        var wrappedStore = new DictionaryStore { [HeaderNames.Connection] = new[] { "keep-alive", "upgrade" } };
        var wrapped = owner.Create(wrappedStore);
        var beforeWrites = wrappedStore.Writes;
        owner.Append(wrapped, HeaderNames.Connection, "close");
        Evidence.Require(wrappedStore.Reads == 1 && wrappedStore.Writes == beforeWrites + 1
            && wrapped[HeaderNames.Connection].SequenceEqual(["keep-alive", "upgrade", "close"]),
            "Wrapped dictionary interface operations differ.");
        completed.Add("Wrapped.InterfaceReadThenWrite");
        var derivedStore = new InterfaceTrackingDictionary { [HeaderNames.Connection] = "keep-alive" };
        var derived = owner.Create(derivedStore);
        owner.Append(derived, HeaderNames.Connection, "close");
        Evidence.Require(derivedStore.Reads == 1 && derivedStore.Writes == 1
            && derived[HeaderNames.Connection].SequenceEqual(["keep-alive", "close"]), "Derived interface operations differ.");
        completed.Add("Derived.InterfaceReadThenWrite");
        foreach (var readOnly in new[] { false, true })
        {
            var headers = owner.Create();
            owner.SetReadOnly(headers, readOnly);
            var error = ExpectInvalid(() => owner.Append(headers, HeaderNames.Connection, "bad\rvalue"));
            Evidence.Require(error.Message.Contains(readOnly ? "response headers cannot be modified" : "0x0D", StringComparison.Ordinal)
                && headers.Count == 0, "Validation order or failure state differs.");
            completed.Add(readOnly ? "Readonly.PrecedesCharacterValidation" : "Characters.BeforeMutation");
        }
        var trailers = owner.Create(checkTrailers: true);
        owner.SetReadOnly(trailers, true);
        var trailerError = ExpectInvalid(() => owner.Append(trailers, HeaderNames.Connection, "close"));
        Evidence.Require(trailerError.Message == "The 'Connection' header is not allowed in HTTP trailers."
            && trailers.Count == 0, "Trailer restriction order differs.");
        completed.Add("Trailers.RestrictionPrecedesReadonly");
        Evidence.Require(completed.Count == 10, "All predeclared store contracts must execute.");
        Evidence.Write("actual-shared-owner-contracts", new { actualOwner = owner.Owner.GetName().Name, actualPassed = completed });
    }

    private static InvalidOperationException ExpectInvalid(Action action)
    {
        try
        {
            action();
        }
        catch (InvalidOperationException error)
        {
            return error;
        }

        throw new InvalidOperationException("Expected the original precise InvalidOperationException.");
    }

    private sealed class InterfaceTrackingDictionary() : Dictionary<string, StringValues>(StringComparer.OrdinalIgnoreCase),
        IDictionary<string, StringValues>
    {
        internal int Reads { get; private set; }
        internal int Writes { get; private set; }
        StringValues IDictionary<string, StringValues>.this[string key]
        {
            get => base[key];
            set
            {
                Writes++;
                base[key] = value;
            }
        }
        bool IDictionary<string, StringValues>.TryGetValue(string key, out StringValues value)
        {
            Reads++;

            return base.TryGetValue(key, out value);
        }
    }
}
