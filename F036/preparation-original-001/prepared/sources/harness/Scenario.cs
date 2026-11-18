// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Globalization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace AutoPerf;

internal sealed class Scenario
{
    public Scenario(int count)
    {
        var metadata = new EmptyModelMetadataProvider();
        TopLevel = new ViewDataDictionary(metadata, new ModelStateDictionary());
        Typed = new ViewDataDictionary<object?>(metadata, new ModelStateDictionary());
        Dictionary = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        for (var index = 0; index < count; index++)
        {
            var key = Key(index);
            object? value = (index % 3) switch
            {
                0 => null,
                1 => index,
                _ => "value-" + index.ToString("D3", CultureInfo.InvariantCulture),
            };
            TopLevel.Add(key, value);
            Typed.Add(key, value);
            Dictionary.Add(key, value);
        }
        ReadCopy = new ViewDataDictionary(TopLevel);
        NestedCopy = new ViewDataDictionary(new ViewDataDictionary<object?>(ReadCopy));
        MaterializedCopy = new ViewDataDictionary(TopLevel);
        Evidence.Require(!MaterializedCopy.Remove("__absent__"), "The materializing write must not remove data.");
        Generic = TopLevel;
        NonGeneric = TopLevel;

        var expected = 17;
        for (var index = 0; index < count; index++)
        {
            var valueScore = (index % 3) switch
            {
                0 => -1,
                1 => index,
                _ => 9,
            };
            expected = unchecked(expected * 31 + 6 + valueScore);
        }
        ExpectedScore = expected;
        Evidence.Require(TopLevel.Count == count && Typed.Count == count && ReadCopy.Count == count &&
            NestedCopy.Count == count && MaterializedCopy.Count == count && Dictionary.Count == count,
            "All public producers must prepare the exact requested cardinality.");
    }

    public ViewDataDictionary TopLevel { get; }
    public ViewDataDictionary<object?> Typed { get; }
    public ViewDataDictionary ReadCopy { get; }
    public ViewDataDictionary NestedCopy { get; }
    public ViewDataDictionary MaterializedCopy { get; }
    public IEnumerable<KeyValuePair<string, object?>> Generic { get; }
    public System.Collections.IEnumerable NonGeneric { get; }
    public Dictionary<string, object?> Dictionary { get; }
    public int ExpectedScore { get; }

    public static string Key(int index) => "Key" + index.ToString("D3", CultureInfo.InvariantCulture);

    public static int Score(KeyValuePair<string, object?> pair)
    {
        var value = pair.Value switch
        {
            null => -1,
            int number => number,
            string text => text.Length,
            _ => throw new InvalidOperationException("Unexpected prepared value type."),
        };

        return pair.Key.Length + value;
    }
}
