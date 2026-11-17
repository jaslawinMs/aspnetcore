using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace AutoPerf;

public class ExpressionBenchmarks
{
    private ExpressionFixture? _fixture;

    public IEnumerable<string> Cases => ExpressionProfiles.All;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    [GlobalSetup]
    public void Setup()
    {
        Evidence.Write("settings-setup", SettingsPreservingEmitToolchain.ReadSettings());
        Evidence.Write("executing-owner", new { shape = Case, ownerSha256 = Evidence.Hash(typeof(ModelExpressionProvider).Assembly.Location) });
        _fixture = new ExpressionFixture(Case);
        _fixture.CaptureContract("setup");
    }

    [Benchmark]
    public int Exercise()
    {
        return (_fixture ?? throw new InvalidOperationException("Actual MVC fixture setup required.")).Exercise();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        (_fixture ?? throw new InvalidOperationException("Actual MVC fixture setup required.")).CaptureContract("cleanup");
    }
}

internal static class ExpressionProfiles
{
    public static readonly string[] All =
    [
        "Name.List.Constant",
        "Name.List.Captured",
        "Name.Dictionary.Captured",
        "Name.Nested.TwoIndexers",
        "Name.List.NewExpression",
        "Name.Member.Control",
        "Name.Array.Control",
        "Name.Method.Control",
        "Model.Indexer.RuntimeType",
        "Model.Indexer.Value",
        "Model.Member.Control",
        "Model.Array.Control",
        "Classifier.Indexer.Helper",
        "Classifier.Method.Control",
    ];
}
