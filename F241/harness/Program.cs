using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.ViewComponents;

var assembly = typeof(ViewComponentFeatureProvider).Assembly;
Console.WriteLine($"ViewFeatures assembly: {assembly.Location}");
Console.WriteLine($"ViewFeatures MVID: {assembly.ManifestModule.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var scenario in ViewComponentDiscoveryBenchmark.Cases)
    {
        new ViewComponentDiscoveryBenchmark { Case = scenario }.Setup();
    }
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
