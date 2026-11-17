using BenchmarkDotNet.Attributes;

namespace AutoPerf;

/// <summary>Original actual middleware diagnostic;no candidate or before/after comparison.</summary>
public class LocalizationBenchmarks
{
    private RequestFixture _fixture = null!;
    private string _expected = "";
    private bool _hasProvider;

    [ParamsAllValues]
    public Shape Shape { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        (_fixture, _expected, _hasProvider) = LocalizationSamples.Timed(Shape);
        var proof = _fixture.Proof(Shape.ToString(), "timed-setup-native-provider");
        Evidence.Require(proof.IsCompletedSuccessfully, "These actual native setup producers must complete synchronously.");
        proof.GetAwaiter().GetResult();
        var request = Invoke();
        Evidence.Require(request.IsCompletedSuccessfully, "This prepared actual middleware pipeline must complete synchronously.");
        request.GetAwaiter().GetResult();
        Validate();
        Evidence.Write("timed-setup-preflight", new { shape = Shape.ToString(), actualTimedTaskWrapperInvokedUntimed = true, passed = true });
    }

    [Benchmark]
    public Task Invoke() => _fixture.Invoke();

    public void Validate() => _fixture.Observe(Shape.ToString(), _expected, _expected, _hasProvider);
}
