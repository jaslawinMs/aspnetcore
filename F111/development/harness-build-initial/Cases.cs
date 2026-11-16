using System.Collections;
using System.Text;
using System.Text.Json;

namespace AutoPerf;

internal enum FixtureEnum
{
    First = 7,
    Second = 19,
}

internal sealed record CaseSpec(string Label, string Mode, Func<object> Create, int? ExactOutputLength = null);

internal static class Cases
{
    internal static readonly CaseSpec[] All =
    [
        new("DataEmpty", "Data", () => Data()),
        new("DataNull", "Data", () => Data(("Null", null))),
        new("DataScalar", "Data", Scalars),
        new("DataAscii1K", "Data", () => TextData(new string('A', 1024))),
        new("DataAscii16K", "Data", () => TextData(new string('A', 16384))),
        new("DataAscii128K", "Data", () => TextData(new string('A', 131072))),
        new("DataEscaped16K", "Data", () => TextData(Escaped())),
        new("DataUnicode16K", "Data", () => TextData(Unicode())),
        new("DataEntries16", "Data", () => Entries(16)),
        new("DataEntries256", "Data", () => Entries(256)),
        new("DataArray256", "Data", () => Data(("Numbers", Enumerable.Range(0, 256).ToArray()))),
        new("DataNested", "Data", () => Data(("Nested", Nested()))),
        new("DataEnum", "Data", () => Data(
            ("Enum", FixtureEnum.Second),
            ("Enums", new List<FixtureEnum?> { FixtureEnum.First, null, FixtureEnum.Second }),
            ("Map", new Dictionary<string, FixtureEnum> { ["First"] = FixtureEnum.First }))),
        new("DataBelow4K", "Data", () => BoundaryData(4095), 4095),
        new("DataAt4K", "Data", () => BoundaryData(4096), 4096),
        new("DataAbove4K", "Data", () => BoundaryData(4097), 4097),
        new("SessionEmpty", "Session", () => Data()),
        new("SessionScalar", "Session", Scalars),
        new("SessionAscii16K", "Session", () => TextData(new string('A', 16384))),
        new("SessionAscii128K", "Session", () => TextData(new string('A', 131072))),
        new("SessionEscaped16K", "Session", () => TextData(Escaped())),
        new("SessionEntries256", "Session", () => Entries(256)),
        new("SessionNested", "Session", () => Data(("Nested", Nested()))),
        new("ValueStringSmall", "Value", () => "small unchanged SerializeValue"),
        new("ValueString16K", "Value", () => new string('A', 16384)),
        new("ValueUnicode16K", "Value", Unicode),
        new("ValueArray256", "Value", () => Enumerable.Range(0, 256).ToArray()),
        new("ValueNested", "Value", Nested),
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

    private static Dictionary<string, object?> Scalars() => Data(
        ("Integer", 37), ("Boolean", true), ("Text", "small"),
        ("Guid", Guid.Parse("73aee050-c7da-4a43-9c43-9052db80bef1")),
        ("Date", new DateTime(2026, 11, 1, 12, 34, 56, DateTimeKind.Utc)));

    private static Dictionary<string, object?> TextData(string value) => Data(("Value", value));

    private static Dictionary<string, object?> Entries(int count)
    {
        var result = Data();
        for (var index = 0; index < count; index++)
        {
            result.Add("Key" + index.ToString("D4"), "value-" + index.ToString("D4") + new string('B', 32));
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

    private static Dictionary<string, object?> BoundaryData(int exactBytes)
    {
        const string emptyEnvelope = "{\"Value\":{\"type\":\"System.String\",\"value\":\"\"}}";

        return TextData(new string('A', exactBytes - Encoding.UTF8.GetByteCount(emptyEnvelope)));
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
