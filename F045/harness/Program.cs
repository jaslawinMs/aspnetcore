using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

Console.WriteLine($"ViewFeatures assembly: {typeof(DefaultHtmlGenerator).Assembly.Location}");
Console.WriteLine($"ViewFeatures MVID: {typeof(DefaultHtmlGenerator).Module.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var otherFields in new[] { 0, 63, 255 })
    {
        foreach (var name in new ValidationMessageBenchmark().Cases)
        {
            var benchmark = new ValidationMessageBenchmark { Case = name, OtherFields = otherFields };
            benchmark.Setup();
            Console.WriteLine($"Verified setup: {name};OtherFields={otherFields}");
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
