// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using System.Reflection;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace AutoPerf;

internal static class Contracts
{
    public static readonly int[] Counts = [0, 1, 8, 64];
    public static readonly string[] Methods =
    [
        nameof(EnumerationBenchmarks.TopLevelConcrete),
        nameof(EnumerationBenchmarks.TopLevelInterface),
        nameof(EnumerationBenchmarks.TypedConcrete),
        nameof(EnumerationBenchmarks.ReadCopy),
        nameof(EnumerationBenchmarks.NestedCopy),
        nameof(EnumerationBenchmarks.MaterializedCopy),
        nameof(EnumerationBenchmarks.NonGeneric),
        nameof(EnumerationBenchmarks.DictionaryConcreteControl),
    ];

    private static readonly List<object> _records = [];
    public static int Observations => _records.Count;
    public static int BenchmarkLifecycles { get; private set; }

    private sealed record Outcome(object? Value, string? ErrorType, string? ErrorMessage);

    private static object Pair(KeyValuePair<string, object?> pair) =>
        new { key = pair.Key, valueType = pair.Value?.GetType().FullName, value = pair.Value };

    private static object[] Pairs(IEnumerable<KeyValuePair<string, object?>> pairs) => pairs.Select(Pair).ToArray();

    private static void EqualPairs(IEnumerable<KeyValuePair<string, object?>> actual, params KeyValuePair<string, object?>[] expected)
    {
        Evidence.Require(Evidence.Compact(Pairs(actual)) == Evidence.Compact(Pairs(expected)),
            "The complete ordered key/value sequence differs.");
    }

    private static void Record(string name, object value) => _records.Add(new { name, value });

    private static Outcome Capture(Func<object?> operation)
    {
        try
        {
            var value = operation();

            return new Outcome(value is KeyValuePair<string, object?> pair ? Pair(pair) : value, null, null);
        }
        catch (InvalidOperationException exception)
        {
            return new Outcome(null, exception.GetType().FullName, exception.Message);
        }
        catch (NotSupportedException exception)
        {
            return new Outcome(null, exception.GetType().FullName, exception.Message);
        }
    }

    private static ViewDataDictionary NewViewData() =>
        new(new EmptyModelMetadataProvider(), new ModelStateDictionary());

    public static void Run()
    {
        foreach (var count in Counts)
        {
            var scenario = new Scenario(count);
            var expected = scenario.Dictionary.ToArray();
            Cursor("base-generic", count, ((IEnumerable<KeyValuePair<string, object?>>)scenario.TopLevel).GetEnumerator(), true, expected);
            Cursor("base-nongeneric", count, ((IEnumerable)scenario.TopLevel).GetEnumerator(), false, expected);
            Cursor("typed-generic", count, ((IEnumerable<KeyValuePair<string, object?>>)scenario.Typed).GetEnumerator(), true, expected);
            Cursor("copy-generic", count, ((IEnumerable<KeyValuePair<string, object?>>)scenario.ReadCopy).GetEnumerator(), true, expected);
            Cursor("nested-generic", count, ((IEnumerable<KeyValuePair<string, object?>>)scenario.NestedCopy).GetEnumerator(), true, expected);
            Cursor("materialized-generic", count, ((IEnumerable<KeyValuePair<string, object?>>)scenario.MaterializedCopy).GetEnumerator(), true, expected);
            IndependentCursors(count, scenario.TopLevel, expected);
        }
        CaseInsensitiveKeysAndNullValues();
        PublicCopiesRemainLiveThenDetach();
        NestedCopiesFollowTheirImmediateSource();
        UnsuccessfulRemoveStillDetaches();
        DerivedEnumerationIsForwardedAndMaterialized();
        Evidence.Require(Observations == 33, "Require all33predeclared semantic records.");
        Evidence.Write("contracts", new { actualSemanticRecords = Observations, records = _records });
    }

    private static void Cursor(string path, int count, IEnumerator cursor, bool generic, KeyValuePair<string, object?>[] expected)
    {
        if (cursor is not IDisposable disposable)
        {
            throw new InvalidOperationException("The actual ViewData cursor must implement IDisposable.");
        }
        object? Current() => generic ? ((IEnumerator<KeyValuePair<string, object?>>)cursor).Current : cursor.Current;
        try
        {
            var before = Capture(Current);
            var values = new List<KeyValuePair<string, object?>>();
            while (cursor.MoveNext())
            {
                if (Current() is not KeyValuePair<string, object?> pair)
                {
                    throw new InvalidOperationException("Actual Current must be a key/value pair,not DictionaryEntry.");
                }
                values.Add(pair);
            }
            EqualPairs(values, expected);
            var exhaustedAgain = cursor.MoveNext();
            Evidence.Require(!exhaustedAgain, "Repeated exhaustion must remain false.");
            var after = Capture(Current);
            var reset = Capture(() =>
            {
                cursor.Reset();

                return "completed";
            });
            var resetCurrent = Capture(Current);
            var resetMove = Capture(() => cursor.MoveNext());
            var afterResetMove = Capture(Current);
            var dispose = Capture(() =>
            {
                disposable.Dispose();

                return "completed";
            });
            var disposedCurrent = Capture(Current);
            var disposedMove = Capture(() => cursor.MoveNext());
            var afterDisposedMove = Capture(Current);
            Record("Cursor:" + path + ":" + count, new
            {
                path,
                count,
                generic,
                actualReturnedType = cursor.GetType().FullName,
                actualReturnedTypeIsValueType = cursor.GetType().IsValueType,
                before,
                values = Pairs(values),
                exhaustedAgain,
                after,
                reset,
                resetCurrent,
                resetMove,
                afterResetMove,
                dispose,
                disposedCurrent,
                disposedMove,
                afterDisposedMove,
            });
        }
        finally
        {
            disposable.Dispose();
        }
    }

    private static void IndependentCursors(int count, ViewDataDictionary viewData, KeyValuePair<string, object?>[] expected)
    {
        using var left = ((IEnumerable<KeyValuePair<string, object?>>)viewData).GetEnumerator();
        using var right = ((IEnumerable<KeyValuePair<string, object?>>)viewData).GetEnumerator();
        var leftFirst = left.MoveNext();
        var leftSecond = left.MoveNext();
        var rightFirst = right.MoveNext();
        Evidence.Require(leftFirst == (count > 0) && leftSecond == (count > 1) && rightFirst == (count > 0),
            "Actual cursor positions must be independent.");
        if (rightFirst)
        {
            EqualPairs([right.Current], expected[0]);
        }
        Record(nameof(IndependentCursors) + ":" + count, new
        {
            count,
            leftFirst,
            leftSecond,
            rightFirst,
            sameCursorObject = ReferenceEquals(left, right),
            actualRightCurrent = Capture(() => right.Current),
        });
    }

    private static void CaseInsensitiveKeysAndNullValues()
    {
        var viewData = NewViewData();
        viewData.Add("Title", "before");
        viewData.Add("Nullable", null);
        viewData["TITLE"] = "after";
        Evidence.Require(viewData.Count == 2 && Equals(viewData["title"], "after") &&
            viewData.TryGetValue("nullable", out var value) && value is null,
            "Case-insensitive updates and a present null must survive.");
        EqualPairs(viewData, new("Title", "after"), new("Nullable", null));
        string? duplicateType = null;
        string? duplicateMessage = null;
        try
        {
            viewData.Add("title", "duplicate");
        }
        catch (ArgumentException exception)
        {
            duplicateType = exception.GetType().FullName;
            duplicateMessage = exception.Message;
        }
        Evidence.Require(duplicateType == typeof(ArgumentException).FullName && viewData.Count == 2,
            "Case-insensitive duplicate Add must actually reject the duplicate.");
        Record(nameof(CaseInsensitiveKeysAndNullValues), new { values = Pairs(viewData), duplicateType, duplicateMessage });
    }

    private static void PublicCopiesRemainLiveThenDetach()
    {
        var source = NewViewData();
        var model = new object();
        source.Model = model;
        source.TemplateInfo.HtmlFieldPrefix = "before";
        source.Add("Alpha", 1);
        source.Add("Beta", null);
        var copy = new ViewDataDictionary(source);
        source["ALPHA"] = 2;
        source.Add("Gamma", "source");
        EqualPairs(copy, new("Alpha", 2), new("Beta", null), new("Gamma", "source"));
        var beforeDetachValues = Pairs(copy);
        using var beforeDetach = ((IEnumerable<KeyValuePair<string, object?>>)copy).GetEnumerator();
        Evidence.Require(beforeDetach.MoveNext(), "Acquire a real live-source cursor before first copy write.");
        copy["Child"] = 3;
        using var afterDetach = ((IEnumerable<KeyValuePair<string, object?>>)copy).GetEnumerator();
        Evidence.Require(afterDetach.MoveNext(), "Acquire a real materialized-copy cursor.");
        source["alpha"] = 99;
        source.Add("Later", "late");
        source.Model = new object();
        source.TemplateInfo.HtmlFieldPrefix = "after";
        EqualPairs(copy, new("Alpha", 2), new("Beta", null), new("Gamma", "source"), new("Child", 3));
        Evidence.Require(!source.ContainsKey("Child") && ReferenceEquals(copy.Model, model) &&
            ReferenceEquals(copy.ModelState, source.ModelState) && copy.TemplateInfo.HtmlFieldPrefix == "before" &&
            !ReferenceEquals(copy.TemplateInfo, source.TemplateInfo),
            "Copy data must detach while existing model/model-state/template-info contracts remain intact.");
        var oldCursorMove = Capture(() => beforeDetach.MoveNext());
        Evidence.Require(oldCursorMove.ErrorType == typeof(InvalidOperationException).FullName,
            "A source Add must invalidate the cursor acquired before detachment.");
        Evidence.Require(afterDetach.MoveNext() && afterDetach.Current.Key == "Beta",
            "The cursor acquired after detachment must survive a source Add.");
        copy.Add("CopyLater", 4);
        var detachedCursorMove = Capture(() => afterDetach.MoveNext());
        Evidence.Require(detachedCursorMove.ErrorType == typeof(InvalidOperationException).FullName &&
            !source.ContainsKey("CopyLater"), "A copy Add must affect only its own dictionary/cursor.");
        Record(nameof(PublicCopiesRemainLiveThenDetach), new
        {
            beforeDetachValues,
            afterSourceMutationValues = Pairs(copy),
            sourceValues = Pairs(source),
            oldCursorMove,
            detachedCursorMove,
            actualModelSnapshotPreserved = ReferenceEquals(copy.Model, model),
            actualModelStateShared = ReferenceEquals(copy.ModelState, source.ModelState),
            actualTemplateInfoCopied = !ReferenceEquals(copy.TemplateInfo, source.TemplateInfo),
        });
    }

    private static void NestedCopiesFollowTheirImmediateSource()
    {
        var root = NewViewData();
        root.Add("Root", 1);
        var middle = new ViewDataDictionary(root);
        var inner = new ViewDataDictionary<object?>(middle);
        root["ROOT"] = 2;
        root.Add("Early", "root");
        EqualPairs(inner, new("Root", 2), new("Early", "root"));
        var beforeMiddleWrite = Pairs(inner);
        middle["Middle"] = 3;
        root.Add("RootLater", 4);
        EqualPairs(inner, new("Root", 2), new("Early", "root"), new("Middle", 3));
        var afterMiddleWrite = Pairs(inner);
        inner["Inner"] = 5;
        middle.Add("MiddleLater", 6);
        EqualPairs(inner, new("Root", 2), new("Early", "root"), new("Middle", 3), new("Inner", 5));
        Evidence.Require(!root.ContainsKey("Middle") && !middle.ContainsKey("Inner"),
            "Nested public copy writes must remain independent.");
        Record(nameof(NestedCopiesFollowTheirImmediateSource), new
        {
            beforeMiddleWrite,
            afterMiddleWrite,
            afterInnerWrite = Pairs(inner),
            actualRoot = Pairs(root),
            actualMiddle = Pairs(middle),
        });
    }

    private static void UnsuccessfulRemoveStillDetaches()
    {
        var cases = new List<object>();
        foreach (var count in new[] { 0, 1 })
        {
            var source = NewViewData();
            if (count == 1)
            {
                source.Add("Original", 1);
            }
            var copy = new ViewDataDictionary(source);
            Evidence.Require(!copy.Remove("Absent"), "Require a genuinely unsuccessful public Remove.");
            source["Later"] = 2;
            if (count == 1)
            {
                source["ORIGINAL"] = 3;
                EqualPairs(copy, new KeyValuePair<string, object?>("Original", 1));
            }
            else
            {
                EqualPairs(copy);
            }
            Evidence.Require(copy.Count == count && !copy.ContainsKey("Later"),
                "Even missing-key Remove must materialize the copy before later source mutation.");
            cases.Add(new { count, actualCopy = Pairs(copy), actualSource = Pairs(source) });
        }
        Record(nameof(UnsuccessfulRemoveStillDetaches), new { actualIndependentlyExecutedCases = cases.Count, cases });
    }

    private static void DerivedEnumerationIsForwardedAndMaterialized()
    {
        var source = new ReversedViewData();
        ViewDataDictionary baseReceiver = source;
        var concrete = new List<KeyValuePair<string, object?>>();
        foreach (var pair in baseReceiver)
        {
            concrete.Add(pair);
        }
        EqualPairs(concrete, new("Second", 22), new("First", 11));
        var derivedConcrete = new List<KeyValuePair<string, object?>>();
        foreach (var pair in source)
        {
            derivedConcrete.Add(pair);
        }
        EqualPairs(derivedConcrete, new("Second", 22), new("First", 11));
        var copy = new ViewDataDictionary(source);
        using var forwardedCursor = ((IEnumerable<KeyValuePair<string, object?>>)copy).GetEnumerator();
        var beforeType = forwardedCursor.GetType().FullName;
        Evidence.Require(!forwardedCursor.GetType().IsValueType && source.Count == 2,
            "Require a real nonempty derived iterator,not a Dictionary struct cursor or skipped empty clone.");
        source["SECOND"] = 99;
        EqualPairs(copy, new("Second", 99), new("First", 11));
        copy.Add("Detached", 33);
        source["Second"] = 100;
        EqualPairs(copy, new("Second", 99), new("First", 11), new("Detached", 33));
        Evidence.Require(Equals(source["second"], 100) && !source.ContainsKey("Detached"),
            "Actual first-write materialization must consume derived enumeration then detach.");
        using var materializedCursor = ((IEnumerable<KeyValuePair<string, object?>>)copy).GetEnumerator();
        Record(nameof(DerivedEnumerationIsForwardedAndMaterialized), new
        {
            actualSourceCountAtMaterializationWasNonzero = true,
            actualBaseConcreteForeach = Pairs(concrete),
            actualDerivedConcreteForeach = Pairs(derivedConcrete),
            actualCopyAfterMaterialization = Pairs(copy),
            actualSourceAfterMutation = Pairs(source),
            actualBeforeMaterializationCursorType = beforeType,
            actualAfterMaterializationCursorType = materializedCursor.GetType().FullName,
            actualCandidateApiCompiled = false,
            actualCandidateRegressionClaimed = false,
        });
    }

    public static void RunBenchmarkLifecycles()
    {
        var records = new List<object>();
        foreach (var count in Counts)
        {
            var expected = new Scenario(count).ExpectedScore;
            foreach (var name in Methods)
            {
                var benchmark = new EnumerationBenchmarks { Count = count };
                benchmark.Setup();
                try
                {
                    var method = typeof(EnumerationBenchmarks).GetMethod(name, BindingFlags.Public | BindingFlags.Instance)
                        ?? throw new InvalidOperationException("Declared benchmark method missing.");
                    var actual = method.Invoke(benchmark, null);
                    Evidence.Require(actual is int score && score == expected,
                        "The actual benchmark lifecycle must completely consume its prepared data:" + name);
                    records.Add(new { name = name + ":" + count, expectedScore = expected, actualScore = actual });
                    BenchmarkLifecycles++;
                }
                finally
                {
                    benchmark.Cleanup();
                }
            }
        }
        Evidence.Require(BenchmarkLifecycles == 32, "All32actual benchmark lifecycles must execute.");
        Evidence.Write("benchmark-lifecycles", new { actualProfiles = BenchmarkLifecycles, records });
    }

    private sealed class ReversedViewData : ViewDataDictionary, IEnumerable<KeyValuePair<string, object?>>, IEnumerable
    {
        public ReversedViewData() : base(new EmptyModelMetadataProvider(), new ModelStateDictionary())
        {
            Add("First", 11);
            Add("Second", 22);
        }

        IEnumerator<KeyValuePair<string, object?>> IEnumerable<KeyValuePair<string, object?>>.GetEnumerator()
        {
            yield return new("Second", this["Second"]);
            yield return new("First", this["First"]);
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return ((IEnumerable<KeyValuePair<string, object?>>)this).GetEnumerator();
        }
    }
}
