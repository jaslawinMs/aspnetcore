using System.Collections;
using System.Globalization;
using System.Linq.Expressions;
using System.Text;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Rewrite;

namespace AutoPerf.Benchmarks;

public class ConditionEnumerationBenchmark
{
    private Func<int> _run;

    [ParamsSource(nameof(Scenarios))]
    public string Scenario { get; set; }

    public IEnumerable<string> Scenarios
    {
        get
        {
            foreach (var count in new[] { 1, 4, 16 })
            {
                foreach (var grouping in new[] { "All", "Any" })
                {
                    foreach (var outcome in new[] { "Pass", "Fail", "First", "Last" })
                    {
                        yield return $"Eval_{grouping}_{outcome}_{count}";
                    }
                }

                yield return $"Iface_All_Pass_{count}";
            }
        }
    }

    [GlobalSetup]
    public void Setup()
    {
        var parts = Scenario.Split('_');
        var count = int.Parse(parts[3], CultureInfo.InvariantCulture);
        var grouping = parts[1] switch
        {
            "All" => "MatchAll",
            "Any" => "MatchAny",
            _ => throw new ArgumentOutOfRangeException(nameof(Scenario)),
        };
        var xml = new StringBuilder("<rewrite><rules><rule name=\"benchmark\"><match url=\".*\" /><conditions logicalGrouping=\"");
        xml.Append(grouping).Append("\" trackAllCaptures=\"false\">");
        for (var i = 0; i < count; i++)
        {
            var fails = parts[2] switch
            {
                "Pass" => false,
                "Fail" => true,
                "First" => i == 0,
                "Last" => i == count - 1,
                _ => throw new ArgumentOutOfRangeException(nameof(Scenario)),
            };
            xml.Append("<add input=\"").Append(fails ? "miss" : "ok")
                .Append("\" pattern=\"^ok$\" ignoreCase=\"false\" />");
        }
        xml.Append("</conditions><action type=\"None\" /></rule></rules></rewrite>");
        using var reader = new StringReader(xml.ToString());
        var rule = new RewriteOptions().AddIISUrlRewrite(reader).Rules.Single();
        var collection = rule.GetType().GetProperty("Conditions")?.GetValue(rule)
            ?? throw new InvalidOperationException("The real IIS parser produced no conditions.");
        var producedCount = collection.GetType().GetProperty("Count")
            ?? throw new InvalidOperationException("The production collection has no Count property.");
        if ((int)producedCount.GetValue(collection)! != count)
        {
            throw new InvalidOperationException("The IIS parser did not produce the requested condition count.");
        }

        int expected;
        if (parts[0] == "Iface")
        {
            var conditions = (IEnumerable)collection;
            _run = () =>
            {
                var visited = 0;
                foreach (var condition in conditions)
                {
                    visited++;
                }

                return visited;
            };
            expected = count;
        }
        else if (parts[0] == "Eval")
        {
            // Compile only the binding; the loop and all matching run in the real production evaluator.
            var evaluator = typeof(RewriteOptions).Assembly.GetType(
                "Microsoft.AspNetCore.Rewrite.IISUrlRewrite.ConditionEvaluator", throwOnError: true)!;
            var method = evaluator.GetMethod("Evaluate")
                ?? throw new InvalidOperationException("The production condition evaluator was not found.");
            var parameters = method.GetParameters();
            var context = new RewriteContext();
            var call = Expression.Call(method,
                Expression.Constant(collection, parameters[0].ParameterType),
                Expression.Constant(context),
                Expression.Constant(null, parameters[2].ParameterType));
            var success = method.ReturnType.GetProperty("Success")
                ?? throw new InvalidOperationException("The production match result has no Success property.");
            _run = Expression.Lambda<Func<int>>(
                Expression.Condition(Expression.Property(call, success),
                    Expression.Constant(1), Expression.Constant(0))).Compile();
            expected = parts[2] == "Pass" ||
                (parts[1] == "Any" && parts[2] != "Fail" && count > 1) ? 1 : 0;
        }
        else
        {
            throw new ArgumentOutOfRangeException(nameof(Scenario));
        }

        if (Run() != expected)
        {
            throw new InvalidOperationException("The production scenario did not reach its expected observable result.");
        }
    }

    [Benchmark]
    public int Run()
    {
        return _run();
    }
}
