using System.Collections;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace AutoPerf;

internal enum FixtureEnum
{
    First = 7,
    Second = 19,
}

internal sealed record CaseSpec(string Label, string Mode, Func<object?> Create, int? ExactOutputLength = null, Type? DeclaredType = null);

internal static class Cases
{
    internal static readonly CaseSpec[] All =
    [
        new("ValueNull", "Value", () => null, DeclaredType: typeof(string)),
        new("ValueScalar", "Value", () => 37),
        new("ValueEmptyString", "Value", () => string.Empty),
        new("ValueStringSmall", "Value", () => "small stored value"),
        new("ValueString1K", "Value", () => new string('A', 1024)),
        new("ValueString16K", "Value", () => new string('A', 16384)),
        new("ValueString128K", "Value", () => new string('A', 131072)),
        new("ValueEscaped16K", "Value", Escaped),
        new("ValueUnicode16K", "Value", Unicode),
        new("ValueArray256", "Value", () => Enumerable.Range(0, 256).ToArray()),
        new("ValueNested", "Value", Nested),
        new("ValueEnum", "Value", () => FixtureEnum.Second),
        new("ValueNullableEnums", "Value", () => new FixtureEnum?[] { FixtureEnum.First, null, FixtureEnum.Second }),
        new("ValueDictionary256", "Value", Dictionary),
        new("ValueBelow4K", "Value", () => Boundary(4095), 4095),
        new("ValueAt4K", "Value", () => Boundary(4096), 4096),
        new("ValueAbove4K", "Value", () => Boundary(4097), 4097),
        new("SessionScalar", "Session", () => 37),
        new("SessionString16K", "Session", () => new string('A', 16384)),
        new("SessionString128K", "Session", () => new string('A', 131072)),
        new("SessionEscaped16K", "Session", Escaped),
        new("SessionUnicode16K", "Session", Unicode),
        new("SessionArray256", "Session", () => Enumerable.Range(0, 256).ToArray()),
        new("SessionNested", "Session", Nested),
        new("SessionDictionary256", "Session", Dictionary),
        new("SessionNull", "Session", () => null),
        new("DataScalarControl", "Data", () => Data(("Integer", 37), ("Boolean", true), ("Text", "unchanged bulk path"))),
        new("DataString16KControl", "Data", () => Data(("Value", new string('A', 16384)))),
    ];

    internal static Dictionary<string, object?> Data(params (string Key, object? Value)[] entries)
    {
        var result = new Dictionary<string, object?>(StringComparer.Ordinal);
        foreach (var (key, value) in entries)
        {
            result.Add(key, value);
        }

        return result;
    }

    private static Dictionary<string, string> Dictionary()
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < 256; index++)
        {
            result.Add("Key" + index.ToString("D4", CultureInfo.InvariantCulture),
                "value-" + index.ToString("D4", CultureInfo.InvariantCulture) + new string('B', 32));
        }

        return result;
    }

    private static string Escaped() => string.Concat(Enumerable.Repeat("<&\\\"\n", 3277))[..16384];

    private static string Unicode() => string.Concat(Enumerable.Repeat("\u00e9\u4e2d\U0001F30D", 4096));

    private static object?[] Nested() =>
    [
        "root", 17, null, new int[] { 7, 11, 19 },
        new object?[] { false, "\u00e9<&\\\"\n", new object?[] { 23, null, "leaf" } },
        new List<int?> { 1, null, 3 },
    ];

    private static string Boundary(int exactBytes)
    {
        const string emptyEnvelope = "{\"type\":\"System.String\",\"value\":\"\"}";

        return new string('A', exactBytes - Encoding.UTF8.GetByteCount(emptyEnvelope));
    }

    internal static object? Describe(object? value)
    {
        if (value is null)
        {
            return null;
        }
        var type = value.GetType().AssemblyQualifiedName;
        if (value is IDictionary dictionary)
        {
            var entries = new List<object>();
            foreach (DictionaryEntry entry in dictionary)
            {
                entries.Add(new { key = entry.Key, value = Describe(entry.Value) });
            }

            return new { type, entries };
        }
        if (value is IEnumerable sequence and not string)
        {
            var items = new List<object?>();
            foreach (var item in sequence)
            {
                items.Add(Describe(item));
            }

            return new { type, items };
        }

        return new { type, value = JsonSerializer.SerializeToElement(value, value.GetType()) };
    }
}
