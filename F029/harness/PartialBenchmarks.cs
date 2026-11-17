using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class PartialBenchmarks
{
    private PartialFixture _fixture = null!;

    [ParamsSource(nameof(Cases))]
    public string Profile { get; set; } = "";

    public IEnumerable<string> Cases => PartialContracts.Profiles;

    [GlobalSetup]
    public void Setup()
    {
        _fixture = new PartialFixture();
        var operation = _fixture.RenderAndConsumeAsync(Profile);
        Evidence.Require(operation.IsCompletedSuccessfully &&
            operation.GetAwaiter().GetResult() == (Profile.EndsWith("4096", StringComparison.Ordinal) ? 4103 : 39),
            "The original diagnostic wrapper did not complete and consume its real page.");
        Evidence.Write("benchmark-setup", new
        {
            Profile,
            processId = Environment.ProcessId,
            actualCompletedPublicWrapper = true,
            sourceComparison = false,
            actualOwnerSha256 = Evidence.Hash(typeof(Microsoft.AspNetCore.Mvc.ViewFeatures.HtmlHelper).Assembly.Location),
            actualRendererSha256 = Evidence.Hash(typeof(Microsoft.AspNetCore.Mvc.Razor.RazorView).Assembly.Location),
            actualHarnessSha256 = Evidence.Hash(typeof(PartialBenchmarks).Assembly.Location),
        });
    }

    [Benchmark]
    public Task<int> RenderAndConsume()
    {
        return _fixture.RenderAndConsumeAsync(Profile);
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.Dispose();
    }
}
