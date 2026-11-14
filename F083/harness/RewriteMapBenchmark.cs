using System.Collections;
using System.Globalization;
using System.Linq.Expressions;
using System.Xml.Linq;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Rewrite;

namespace AutoPerf.Benchmarks;

public class RewriteMapBenchmark
{
    private Func<string?> _run = null!;

    [ParamsSource(nameof(Scenarios))]
    public string Scenario { get; set; } = null!;

    public IEnumerable<string> Scenarios
    {
        get
        {
            foreach (var length in new[] { 8, 64, 256, 257, 1024 })
            {
                foreach (var mode in new[] { "LowerHit", "UpperHit", "MixedHit", "UpperMiss" })
                {
                    yield return $"{mode}_{length}";
                }
            }

            foreach (var mode in new[] { "EmptyMiss", "SigmaNormal", "SigmaFinal", "SigmaUpper", "DeseretUpper", "AccentUpper", "DecomposedMiss" })
            {
                yield return mode;
            }
        }
    }

    [GlobalSetup]
    public void Setup()
    {
        var map = new XElement("rewriteMap", new XAttribute("name", "map"),
            new XElement("add", new XAttribute("key", "\u03c3"), new XAttribute("value", "normal")),
            new XElement("add", new XAttribute("key", "\u03c2"), new XAttribute("value", "final")),
            new XElement("add", new XAttribute("key", "\U00010428"), new XAttribute("value", "deseret")),
            new XElement("add", new XAttribute("key", "\u00e9"), new XAttribute("value", "accent")));
        for (var i = 0; i < 64; i++)
        {
            map.Add(new XElement("add", new XAttribute("key", $"unused{i}"), new XAttribute("value", "unused")));
        }

        string query;
        string? expected;
        var parts = Scenario.Split('_');
        if (parts.Length == 2)
        {
            var length = int.Parse(parts[1], CultureInfo.InvariantCulture);
            var lowerKey = new string('a', length);
            map.Add(new XElement("add", new XAttribute("key", lowerKey), new XAttribute("value", "match")));
            query = parts[0] switch
            {
                "LowerHit" => lowerKey,
                "UpperHit" => new string('A', length),
                "MixedHit" => new string(Enumerable.Range(0, length).Select(i => i % 2 == 0 ? 'A' : 'a').ToArray()),
                "UpperMiss" => new string('B', length),
                _ => throw new ArgumentOutOfRangeException(nameof(Scenario)),
            };
            expected = parts[0] == "UpperMiss" ? null : "match";
        }
        else
        {
            (query, expected) = Scenario switch
            {
                "EmptyMiss" => ("", null),
                "SigmaNormal" => ("\u03c3", "normal"),
                "SigmaFinal" => ("\u03c2", "final"),
                "SigmaUpper" => ("\u03a3", "normal"),
                "DeseretUpper" => ("\U00010400", "deseret"),
                "AccentUpper" => ("\u00c9", "accent"),
                "DecomposedMiss" => ("e\u0301", null),
                _ => throw new ArgumentOutOfRangeException(nameof(Scenario)),
            };
        }

        var xml = new XElement("rewrite",
            new XElement("rewriteMaps", map),
            new XElement("rules",
                new XElement("rule", new XAttribute("name", "map benchmark"),
                    new XElement("match", new XAttribute("url", "^(.*)$"), new XAttribute("ignoreCase", "false")),
                    new XElement("conditions",
                        new XElement("add", new XAttribute("input", "{map:{R:1}}"), new XAttribute("pattern", ".*"))),
                    new XElement("action", new XAttribute("type", "None")))));
        using var reader = new StringReader(xml.ToString());
        var rule = new RewriteOptions().AddIISUrlRewrite(reader).Rules.Single();
        var context = new RewriteContext();
        var initial = GetRequiredProperty(rule, "InitialMatch");
        var initialEvaluate = initial.GetType().GetMethod("Evaluate")
            ?? throw new InvalidOperationException("The real rule matcher was not found.");
        var match = initialEvaluate.Invoke(initial, [query, context])
            ?? throw new InvalidOperationException("The real rule matcher returned no result.");
        if (GetRequiredProperty(match, "Success") is not true)
        {
            throw new InvalidOperationException("The real rule matcher did not capture the query.");
        }
        var backReferences = GetRequiredProperty(match, "BackReferences");
        var conditions = (IEnumerable)GetRequiredProperty(rule, "Conditions");
        var condition = conditions.Cast<object>().Single();
        var pattern = GetRequiredProperty(condition, "Input");
        var segments = (IEnumerable)GetRequiredProperty(pattern, "PatternSegments");
        var segment = segments.Cast<object>().Single();
        if (segment.GetType().FullName != "Microsoft.AspNetCore.Rewrite.PatternSegments.RewriteMapSegment")
        {
            throw new InvalidOperationException("The real input parser did not produce the map segment.");
        }
        var evaluate = segment.GetType().GetMethod("Evaluate")
            ?? throw new InvalidOperationException("The real map evaluator was not found.");
        var parameters = evaluate.GetParameters();
        var call = Expression.Call(Expression.Constant(segment), evaluate,
            Expression.Constant(context),
            Expression.Constant(backReferences, parameters[1].ParameterType),
            Expression.Constant(null, parameters[2].ParameterType));
        _run = Expression.Lambda<Func<string?>>(call).Compile();
        if (!string.Equals(Run(), expected, StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"The production map did not produce the expected result for {Scenario}.");
        }
    }

    [Benchmark]
    public string? Run()
    {
        return _run();
    }

    private static object GetRequiredProperty(object instance, string name)
    {
        return instance.GetType().GetProperty(name)?.GetValue(instance)
            ?? throw new InvalidOperationException($"The production object has no non-null {name} property.");
    }
}
