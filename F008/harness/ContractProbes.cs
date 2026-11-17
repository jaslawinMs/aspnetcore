using System.Collections.ObjectModel;
using System.Globalization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;

namespace AutoPerf;

internal static class ContractProbes
{
    public static async Task<int> Run()
    {
        var checks = 0;
        var en = CultureInfo.GetCultureInfo("en-US");
        var fr = CultureInfo.GetCultureInfo("fr-FR");
        async Task<RequestObservation> Check(RequestFixture fixture, string label, string expected, bool provider,
            string? ui = null, string? separator = null, bool nativeResult = true)
        {
            await fixture.Proof(label, "untimed-native-producer", nativeResult);
            var before = fixture.NextCalls;
            await fixture.Invoke();
            Evidence.Require(fixture.NextCalls == before + 1, label + ":exactly one real downstream call required.");
            checks++;

            return fixture.Observe(label, expected, ui ?? expected, provider, separator);
        }

        var live = new List<CultureInfo> { en };
        var addition = new RequestFixture(live);
        var additionBefore = await Check(addition, "LiveListBeforeAddition", "en-US", false);
        live.Add(fr);
        var additionAfter = await Check(addition, "LiveListAfterAddition", "fr-FR", true);
        Evidence.Require(ReferenceEquals(addition.Options.SupportedCultures, live), "Caller-owned list identity changed.");
        live.Remove(fr);
        var removalAfter = await Check(addition, "LiveListAfterRemoval", "en-US", false);
        Evidence.Write("mutation", new { kind = "add-remove-after-construction", sameMiddleware = true, sameOptions = true,
            sameListReference = ReferenceEquals(addition.Options.SupportedCultures, live), additionBefore, additionAfter, removalAfter });

        var replacements = new List<CultureInfo> { en };
        var replaced = new RequestFixture(replacements);
        var replacementBefore = await Check(replaced, "SameCountListBeforeReplacement", "en-US", false);
        replacements[0] = fr;
        var replacementAfter = await Check(replaced, "SameCountListAfterReplacement", "fr-FR", true);
        Evidence.Write("mutation", new { kind = "same-count-list-element", beforeCount = 1, afterCount = replacements.Count,
            sameListReference = ReferenceEquals(replaced.Options.SupportedCultures, replacements), replacementBefore, replacementAfter });

        var backing = new List<CultureInfo> { en };
        var wrapper = new ReadOnlyCollection<CultureInfo>(backing);
        var wrapped = new RequestFixture(wrapper);
        var wrapperBefore = await Check(wrapped, "ReadOnlyWrapperBeforeBackingReplacement", "en-US", false);
        backing[0] = fr;
        var wrapperAfter = await Check(wrapped, "ReadOnlyWrapperAfterBackingReplacement", "fr-FR", true);
        Evidence.Require(((IList<CultureInfo>)wrapper).IsReadOnly, "Expected actual read-only wrapper.");
        Evidence.Write("mutation", new { kind = "readonly-wrapper-mutable-backing", beforeCount = 1, afterCount = wrapper.Count,
            listReportsReadOnly = ((IList<CultureInfo>)wrapper).IsReadOnly,
            sameListReference = ReferenceEquals(wrapped.Options.SupportedCultures, wrapper), wrapperBefore, wrapperAfter });

        CultureInfo[] array = [en];
        var arrayFixture = new RequestFixture(array);
        var arrayBefore = await Check(arrayFixture, "ArrayBeforeElementReplacement", "en-US", false);
        array[0] = fr;
        var arrayAfter = await Check(arrayFixture, "ArrayAfterElementReplacement", "fr-FR", true);
        Evidence.Write("mutation", new { kind = "same-count-array-element", beforeCount = 1, afterCount = array.Length,
            listReportsReadOnly = ((IList<CultureInfo>)array).IsReadOnly,
            sameListReference = ReferenceEquals(arrayFixture.Options.SupportedCultures, array), arrayBefore, arrayAfter });

        var properties = new RequestFixture([en], "?culture=FR-fr&ui-culture=de-DE");
        var propertyBefore = await Check(properties, "OptionsBeforePropertyReplacement", "en-US", false);
        properties.Options.SupportedCultures = [fr];
        properties.Options.SupportedUICultures = [CultureInfo.GetCultureInfo("de-DE")];
        var propertyAfter = await Check(properties, "OptionsAfterPropertyReplacement", "fr-FR", true, ui: "de-DE");
        Evidence.Write("mutation", new { kind = "independent-options-list-properties", sameMiddleware = true, sameOptions = true,
            propertiesReplacedAfterMiddlewareConstruction = true, propertyBefore, propertyAfter });

        var mutable = new CultureInfo("fr-FR");
        mutable.NumberFormat.NumberDecimalSeparator = "~";
        var formatting = new RequestFixture([mutable]);
        var formatBefore = await Check(formatting, "MutableFormatBeforeEdit", "fr-FR", true, separator: "~");
        var oldFeatureCulture = formatting.Context.Features.Get<IRequestCultureFeature>()!.RequestCulture.Culture;
        Evidence.Require(!ReferenceEquals(mutable, oldFeatureCulture), "Mutable selected source culture must be wrapped,not returned directly.");
        mutable.NumberFormat.NumberDecimalSeparator = "^";
        var formatAfter = await Check(formatting, "MutableFormatAfterEdit", "fr-FR", true, separator: "^");
        var newFeatureCulture = formatting.Context.Features.Get<IRequestCultureFeature>()!.RequestCulture.Culture;
        Evidence.Require(!ReferenceEquals(oldFeatureCulture, newFeatureCulture) && oldFeatureCulture.NumberFormat.NumberDecimalSeparator == "~",
            "Each actual mutable selection must get a fresh read-only wrapper preserving its previous snapshot.");
        Evidence.Write("mutation", new { kind = "mutable-culture-format", sameSourceCulture = true, sameListReference = true,
            originalSourceStillMutable = !mutable.IsReadOnly, oldWrapperUnchanged = true, freshReadOnlyWrapper = true, formatBefore, formatAfter });

        var first = new CultureInfo("fr-FR");
        first.NumberFormat.NumberDecimalSeparator = "~";
        var second = new CultureInfo("fr-FR");
        second.NumberFormat.NumberDecimalSeparator = "^";
        var duplicates = new List<CultureInfo> { first, second };
        var duplicate = new RequestFixture(duplicates, "?culture=FR-fr");
        var duplicateBefore = await Check(duplicate, "DuplicateNamesFirstWins", "fr-FR", true, separator: "~");
        (duplicates[0], duplicates[1]) = (duplicates[1], duplicates[0]);
        var duplicateAfter = await Check(duplicate, "DuplicateNamesReordered", "fr-FR", true, separator: "^");
        Evidence.Write("mutation", new { kind = "first-duplicate-reordered", beforeCount = 2, afterCount = duplicates.Count,
            sameListReference = ReferenceEquals(duplicate.Options.SupportedCultures, duplicates), duplicateBefore, duplicateAfter });

        var readOnly = new RequestFixture([fr]);
        await Check(readOnly, "ReadOnlySourceIdentityPreserved", "fr-FR", true);
        Evidence.Require(ReferenceEquals(fr, readOnly.Context.Features.Get<IRequestCultureFeature>()!.RequestCulture.Culture),
            "Already read-only source selection must retain its actual instance.");
        await Check(new([CultureInfo.GetCultureInfo("fr")], "?culture=fr-CA", fallback: true),
            "ActualParentFallback", "fr", true);
        var nullLists = new RequestFixture([en]);
        nullLists.Options.SupportedCultures = null;
        nullLists.Options.SupportedUICultures = null;
        await Check(nullLists, "NullSupportedListsUseDefault", "en-US", false);
        await Check(new([fr], "?culture="), "EmptyNativeInputUsesDefault", "en-US", false);
        await Check(new([fr], "?unrelated=value"), "AbsentNativeInputUsesDefault", "en-US", false, nativeResult: false);

        var header = new RequestFixture([fr], header: "qaa;q=1.0,qab;q=0.9,qac;q=0.8,fr-FR;q=0.7");
        Evidence.Require(header.Provider is AcceptLanguageHeaderRequestCultureProvider { MaximumAcceptLanguageHeaderValuesToTry: 3 },
            "Actual default header candidate limit must be3.");
        await Check(header, "HeaderDefaultThreeExcludesFourth", "en-US", false);
        ((AcceptLanguageHeaderRequestCultureProvider)header.Provider).MaximumAcceptLanguageHeaderValuesToTry = 4;
        await Check(header, "HeaderConfiguredFourIncludesFourth", "fr-FR", true);

        foreach (var size in new[] { 1, 16, 64 })
        {
            foreach (var isHeader in new[] { false, true })
            {
                var names = CultureInfo.GetCultures(CultureTypes.SpecificCultures).Select(value => value.Name)
                    .Where(name => name is not "qaa" and not "qab" and not "qac").Distinct(StringComparer.OrdinalIgnoreCase)
                    .Order(StringComparer.Ordinal).Take(size).ToArray();
                Evidence.Require(names.Length == size, "Actual platform counterexample culture inventory too short.");
                var counted = names.Select(name => new CountingCulture(name)).ToArray();
                var fixture = new RequestFixture(counted.Cast<CultureInfo>().ToArray(), "?culture=qaa",
                    header: isHeader ? "qaa;q=1.0,qab;q=0.9,qac;q=0.8" : null);
                var label = $"{(isHeader ? "Header3" : "Query1")}ActualNameReads{size}";
                await fixture.Proof(label, "untimed-counting-native-producer");
                foreach (var culture in counted)
                {
                    culture.NameReads = 0;
                }
                await fixture.Invoke();
                var reads = counted.Sum(value => value.NameReads);
                var expectedReads = size * (isHeader ? 3 : 1) * 2;
                Evidence.Require(reads == expectedReads, label + ":actual owner Name-read multiplicity differs.");
                fixture.Observe(label, "en-US", "en-US", false);
                Evidence.Require(fixture.Sink is { Entries.Count: 2 } && fixture.Sink.Entries.Select(value => value.Id).SequenceEqual([1, 2]),
                    "Actual unsupported culture/UI debug events must be observed.");
                Evidence.Write("name-reads", new
                {
                    label, supportedCount = size, actualNativeCandidateCount = isHeader ? 3 : 1, observedNameReads = reads, expectedNameReads = expectedReads,
                    actualNativeProvider = fixture.Provider.GetType().FullName, actualOwnerInvokeAndDownstreamExecuted = true,
                    bothCultureAndUiCollectionsScanned = true, fallbackDisabled = true, measurementTimed = false,
                    instrumentationBoundary = "Untimed permitted CultureInfo subclass counts actual overridden Name accesses;not a measured performance/allocation estimate.",
                    actualSupportedNames = names, passed = true
                });
                checks++;
            }
        }

        return checks;
    }

    private sealed class CountingCulture(string name) : CultureInfo(name)
    {
        public int NameReads { get; set; }
        public override string Name
        {
            get
            {
                NameReads++;

                return base.Name;
            }
        }
    }
}
