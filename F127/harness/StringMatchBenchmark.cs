using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Rewrite;

namespace AutoPerf.Benchmarks;

public class StringMatchBenchmark
{
    private Func<string, RewriteContext, object> _evaluate;
    private RewriteContext _context;
    private string _input;

    [Params(8, 64, 256)]
    public int Length { get; set; }

    [Params(false, true)]
    public bool IgnoreCase { get; set; }

    [Params("Equal", "FirstMismatch", "LastMismatch", "DifferentLength")]
    public string Case { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        var value = "/api/" + new string('a', Length - 5);
        var input = IgnoreCase ? value.ToUpperInvariant() : new string(value.AsSpan());
        _input = Case switch
        {
            "Equal" => input,
            "FirstMismatch" => "!" + input[1..],
            "LastMismatch" => input[..^1] + "b",
            "DifferentLength" => input + "x",
            _ => throw new ArgumentOutOfRangeException(nameof(Case)),
        };
        _context = new RewriteContext();

        // Bind once to the real internal matcher without adding product friend assemblies.
        var assembly = typeof(RewriteOptions).Assembly;
        var matcherType = assembly.GetType("Microsoft.AspNetCore.Rewrite.UrlMatches.StringMatch", throwOnError: true)!;
        var operationType = assembly.GetType("Microsoft.AspNetCore.Rewrite.UrlMatches.StringOperationType", throwOnError: true)!;
        var operation = Enum.Parse(operationType, "Equal");
        var matcher = Activator.CreateInstance(matcherType, value, operation, IgnoreCase)
            ?? throw new InvalidOperationException("The production StringMatch constructor returned null.");
        var method = matcherType.GetMethod("Evaluate", [typeof(string), typeof(RewriteContext)])
            ?? throw new InvalidOperationException("The production StringMatch evaluator was not found.");
        _evaluate = method.CreateDelegate<Func<string, RewriteContext, object>>(matcher);
        var success = method.ReturnType.GetProperty("Success")
            ?? throw new InvalidOperationException("The production match result has no success property.");
        if ((bool)success.GetValue(Evaluate())! != (Case == "Equal"))
        {
            throw new InvalidOperationException("The production matcher did not exercise the expected result.");
        }
    }

    [Benchmark]
    public object Evaluate()
    {
        return _evaluate(_input, _context);
    }
}
