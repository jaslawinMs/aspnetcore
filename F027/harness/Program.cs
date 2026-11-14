using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.JsonPatch.SystemTextJson;

Console.WriteLine($"JsonPatch assembly: {typeof(JsonPatchDocument).Assembly.Location}");
Console.WriteLine($"JsonPatch MVID: {typeof(JsonPatchDocument).Module.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var name in new PatchConversionBenchmark().Cases)
    {
        var benchmark = new PatchConversionBenchmark { Case = name };
        benchmark.Setup();
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
