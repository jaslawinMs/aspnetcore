using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.Net.Http.Headers;
using System.Text.Json;

Console.WriteLine($"Headers assembly: {typeof(CookieHeaderValue).Assembly.Location}");
Console.WriteLine($"Headers MVID: {typeof(CookieHeaderValue).Module.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var name in new CookieFormattingBenchmark().Cases)
    {
        var benchmark = new CookieFormattingBenchmark { Case = name };
        benchmark.Setup();
        Console.WriteLine($"Verified setup: {name}");
        Console.WriteLine("Contract receipt: " + JsonSerializer.Serialize(new
        {
            name,
            producer = benchmark.VerifiedProducer,
            name_offset = benchmark.VerifiedNameOffset,
            value_offset = benchmark.VerifiedValueOffset,
            complete_header = benchmark.VerifiedOutput,
            complete_header_sha256 = benchmark.VerifiedOutputHash
        }));
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
