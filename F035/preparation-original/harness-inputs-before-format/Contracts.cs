// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using System.Globalization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Primitives;

namespace AutoPerf;

internal static class Contracts
{
    public static int Observations { get; private set; }
    public static int BenchmarkLifecycles { get; private set; }
    public static readonly int[] Counts = [0, 1, 8, 64];
    public static readonly string[] Methods =
    [
        nameof(EnumerationBenchmarks.PreparedConcrete),
        nameof(EnumerationBenchmarks.PreparedPreboxedGeneric),
        nameof(EnumerationBenchmarks.UnchangedValuesControl),
        nameof(EnumerationBenchmarks.QueryProducer),
        nameof(EnumerationBenchmarks.CollectionBinding),
    ];

    private static void Record(string key, object observation)
    {
        Observations++;
        Evidence.Write("contract", new { key, observation });
    }

    private static object Observe(Func<object?> operation)
    {
        try
        {
            return new { succeeded = true, value = operation() };
        }
        catch (Exception exception)
        {
            return new
            {
                succeeded = false,
                exception = exception.GetType().FullName,
                exception.Message,
                parameter = (exception as ArgumentException)?.ParamName,
            };
        }
    }

    private static object Cursor(Func<IEnumerator> create, string?[] expected)
    {
        var cursor = create();
        var before = Observe(() => cursor.Current);
        var values = new List<object?>();
        while (cursor.MoveNext())
        {
            values.Add(cursor.Current);
            Evidence.Require(values.Count <= expected.Length, "Cursor produced excess values.");
        }
        Evidence.Require(values.Count == expected.Length &&
            values.Zip(expected).All(pair => Equals(pair.First, pair.Second)), "Complete cursor values differ.");
        var repeatedEnd = cursor.MoveNext();
        Evidence.Require(!repeatedEnd, "Completed cursor unexpectedly restarted.");
        var end = Observe(() => cursor.Current);
        var reset = Observe(() =>
        {
            cursor.Reset();

            return "returned";
        });
        var afterReset = Observe(() => cursor.MoveNext());
        var disposed = Observe(() =>
        {
            Evidence.Require(cursor is IDisposable, "Actual enumerator must implement IDisposable.");
            ((IDisposable)cursor).Dispose();

            return "returned";
        });
        var afterDispose = Observe(() => cursor.MoveNext());
        var afterDisposeCurrent = Observe(() => cursor.Current);

        return new
        {
            actualReturnedType = cursor.GetType().FullName,
            before,
            values,
            repeatedEnd,
            end,
            reset,
            afterReset,
            disposed,
            afterDispose,
            afterDisposeCurrent,
        };
    }

    public static async Task RunAsync()
    {
        var data = new (string Name, ValueProviderResult Result, string?[] Expected)[]
        {
            ("Default", default, []),
            ("None", ValueProviderResult.None, []),
            ("NullString", new ValueProviderResult(new StringValues((string?)null)), []),
            ("NullArray", new ValueProviderResult(new StringValues((string?[]?)null)), []),
            ("EmptyArray", new ValueProviderResult(new StringValues(Array.Empty<string>())), []),
            ("EmptyString", new ValueProviderResult(string.Empty), [string.Empty]),
            ("SingleString", new ValueProviderResult("single"), ["single"]),
            ("SingleArray", new ValueProviderResult(new StringValues(["single"])), ["single"]),
            ("MixedArray", new ValueProviderResult(new StringValues(["alpha", null, "", "omega"])), ["alpha", null, "", "omega"]),
            ("CustomCulture", new ValueProviderResult(new StringValues(["un", "deux"]), CultureInfo.GetCultureInfo("fr-FR")), ["un", "deux"]),
        };
        foreach (var item in data)
        {
            Evidence.Require(item.Result.Length == item.Expected.Length, "Result count differs.");
            Record(item.Name + ".Public", new
            {
                item.Result.Length,
                item.Result.FirstValue,
                culture = item.Result.Culture?.Name,
                cursor = Cursor(() => item.Result.GetEnumerator(), item.Expected),
            });
            Record(item.Name + ".Generic", Cursor(() => ((IEnumerable<string>)item.Result).GetEnumerator(), item.Expected));
            Record(item.Name + ".NonGeneric", Cursor(() => ((IEnumerable)item.Result).GetEnumerator(), item.Expected));
        }
        var backing = new[] { "first", "second" };
        var result = new ValueProviderResult(new StringValues(backing));
        using (var left = result.GetEnumerator())
        using (var right = result.GetEnumerator())
        {
            Evidence.Require(!ReferenceEquals(left, right) && left.MoveNext() && right.MoveNext() &&
                left.Current == "first" && right.Current == "first", "Separate cursor starts must be independent.");
            backing[1] = "changed";
            Evidence.Require(left.MoveNext() && left.Current == "changed" && right.Current == "first",
                "Actual live backing array or independent cursor state changed.");
            Evidence.Require(right.MoveNext() && right.Current == "changed", "Second cursor missed live array mutation.");
            Record("LiveArray.IndependentCursors", new
            {
                actualDistinctEnumerators = true,
                actualLeft = left.Current,
                actualRight = right.Current,
                actualBacking = backing,
            });
        }
        foreach (var count in Counts)
        {
            var scenario = new BindingScenario(Enumerable.Range(0, count).Select(index => $"value-{index:D3}").ToArray());
            Evidence.Require(scenario.Provider.GetValue("ITEMS").Values.SequenceEqual(scenario.Expected) &&
                scenario.Provider.GetValue("missing") == ValueProviderResult.None &&
                scenario.Provider.GetValue("") == ValueProviderResult.None, "Actual query key/missing behavior differs.");
            Record($"Query.{count}", new
            {
                scenario.ActualQueryString,
                actualProvider = scenario.Provider.GetType().FullName,
                actualValues = scenario.Result.Values.ToArray(),
                culture = scenario.Result.Culture.Name,
                actualCompleteCursor = Cursor(() => scenario.Result.GetEnumerator(), scenario.Expected),
                actualEmptyCollectionBindingBypassesEnumeration = count == 0,
            });
            var bound = await scenario.BindAsync().ConfigureAwait(false);
            var model = (List<string>)bound.Result.Model!;
            Evidence.Require(model.SequenceEqual(scenario.Expected) && bound.ModelState.ErrorCount == 0 &&
                bound.ModelState.Count == (count == 0 ? 0 : 1), "Actual complete bound model/model-state differs.");
            Record($"Binding.{count}", new
            {
                actualModel = model,
                actualModelSet = bound.Result.IsModelSet,
                bound.ModelState.ErrorCount,
                actualModelState = bound.ModelState.Select(pair => new
                {
                    pair.Key,
                    pair.Value.AttemptedValue,
                    pair.Value.RawValue,
                    errors = pair.Value.Errors.Select(error => error.ErrorMessage).ToArray(),
                }).ToArray(),
            });
        }
        var escaped = new BindingScenario(["a+b c", "caf\u00e9", ""]);
        Evidence.Require(escaped.Result.Values.SequenceEqual(new[] { "a+b c", "caf\u00e9", "" }),
            "Actual request query decoding/order differs.");
        var escapedBinding = await escaped.BindAsync().ConfigureAwait(false);
        var escapedModel = (List<string>)escapedBinding.Result.Model!;
        Evidence.Require(escapedModel.Count == 3 && escapedModel[0] == "a+b c" && escapedModel[1] == "caf\u00e9" &&
            escapedModel[2] is null && escapedBinding.ModelState.ErrorCount == 0,
            "Real string binder must retain decoding/order and convert the empty value to null.");
        Record("Query.EscapedAndEmpty", new
        {
            escaped.ActualQueryString,
            actualValues = escaped.Result.Values.ToArray(),
            actualBound = escapedModel,
            escapedBinding.ModelState.ErrorCount,
        });
        var invalid = new BindingScenario(["7", "bad", "9"]);
        var invalidContext = invalid.CreateBindingContext(new EmptyModelMetadataProvider().GetMetadataForType(typeof(List<int>)));
        var integerBinder = new CollectionModelBinder<int>(
            new SimpleTypeModelBinder(typeof(int), NullLoggerFactory.Instance), NullLoggerFactory.Instance);
        await integerBinder.BindModelAsync(invalidContext).ConfigureAwait(false);
        Evidence.Require(invalidContext.Result.IsModelSet && invalidContext.Result.Model is List<int> &&
            ((List<int>)invalidContext.Result.Model).SequenceEqual(new[] { 7, 9 }) && invalidContext.ModelState.ErrorCount == 1,
            "Actual conversion failure must retain successful items and the model-state error.");
        Record("Binding.ConversionError", new
        {
            actualModel = invalidContext.Result.Model,
            invalidContext.ModelState.ErrorCount,
            actualErrors = invalidContext.ModelState.SelectMany(pair => pair.Value.Errors).Select(error => new
            {
                error.ErrorMessage,
                exception = error.Exception?.GetType().FullName,
            }).ToArray(),
        });
    }

    public static async Task RunBenchmarkLifecyclesAsync()
    {
        foreach (var count in Counts)
        {
            var expected = Enumerable.Range(0, count).Aggregate(17,
                (score, index) => unchecked(score * 31 + $"value-{index:D3}".Length));
            foreach (var method in Methods)
            {
                var benchmark = new EnumerationBenchmarks { Count = count };
                benchmark.Setup();
                var observed = method switch
                {
                    nameof(EnumerationBenchmarks.PreparedConcrete) => benchmark.PreparedConcrete(),
                    nameof(EnumerationBenchmarks.PreparedPreboxedGeneric) => benchmark.PreparedPreboxedGeneric(),
                    nameof(EnumerationBenchmarks.UnchangedValuesControl) => benchmark.UnchangedValuesControl(),
                    nameof(EnumerationBenchmarks.QueryProducer) => benchmark.QueryProducer(),
                    nameof(EnumerationBenchmarks.CollectionBinding) => await benchmark.CollectionBinding().ConfigureAwait(false),
                    _ => throw new InvalidOperationException("Unknown actual benchmark method."),
                };
                Evidence.Require(observed == expected, "Actual benchmark lifecycle produced an incorrect complete score.");
                benchmark.Cleanup();
                BenchmarkLifecycles++;
                Record($"Lifecycle.{method}.{count}", new { actualScore = observed, expected, actualAllSuccessful = true });
            }
        }
    }
}
