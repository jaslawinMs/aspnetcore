using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class AnalyzerBenchmarks
{
    private CompilerSample _sample = null!;

    [Params(Shape.NoLoops, Shape.OneIterator, Shape.Potential16, Shape.Potential64, Shape.Promoted16, Shape.Promoted64,
        Shape.NonRender, Shape.Promoted, Shape.Unmutated, Shape.Cached, Shape.Cached64)]
    public Shape Shape { get; set; }

    [Params(Boundary.WarmCompilation, Boundary.FreshCompilation)]
    public Boundary Boundary { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _sample = new CompilerSample(Shape);
        _sample.WriteInputProof();
        for (var pass = 0; pass < 2; pass++)
        {
            _sample.Validate(_sample.AnalyzeAsync(Boundary).GetAwaiter().GetResult());
        }
        Evidence.Write("benchmark-ready", new { shape = Shape.ToString(), boundary = Boundary.ToString(), actualSetupChecks = 2 });
    }

    [Benchmark]
    public async Task<int> Analyze()
    {
        var diagnostics = await _sample.AnalyzeAsync(Boundary);

        return diagnostics.Length;
    }
}
