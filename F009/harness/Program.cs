using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

Console.WriteLine($"ViewFeatures assembly: {typeof(ViewDataDictionary).Assembly.Location}");
Console.WriteLine($"ViewFeatures MVID: {typeof(ViewDataDictionary).Module.ModuleVersionId}");
var config = ManualConfig.Create(DefaultConfig.Instance)
    .AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors &&
    summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
