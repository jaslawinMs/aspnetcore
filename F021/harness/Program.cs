using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

Console.WriteLine($"ViewFeatures assembly: {typeof(DefaultHtmlGenerator).Assembly.Location}");
Console.WriteLine($"ViewFeatures MVID: {typeof(DefaultHtmlGenerator).Module.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var name in new EnumSelectionBenchmark().Cases)
    {
        var benchmark = new EnumSelectionBenchmark { Case = name };
        benchmark.Setup();
        benchmark.Cleanup();
        Console.WriteLine($"Verified setup: {name}");
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
