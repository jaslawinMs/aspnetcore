using System.Text.Json;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

Console.WriteLine($"ViewFeatures assembly: {typeof(DefaultHtmlGenerator).Assembly.Location}");
Console.WriteLine($"ViewFeatures MVID: {typeof(DefaultHtmlGenerator).Module.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var name in new EnumNameBenchmark().Cases)
    {
        var benchmark = new EnumNameBenchmark { Case = name };
        try
        {
            benchmark.Setup();
            Console.WriteLine($"Verified setup: {name}");
            Console.WriteLine("Contract receipt: " + JsonSerializer.Serialize(new
            {
                name,
                current_values = benchmark.VerifiedCurrentValues,
                select_html = benchmark.VerifiedHtml,
            }));
        }
        finally
        {
            benchmark.Cleanup();
        }
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance)
    .AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors &&
    summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
