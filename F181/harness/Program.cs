using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Routing;

var assembly = typeof(RouteEndpoint).Assembly;
Console.WriteLine($"Routing assembly: {assembly.Location}");
Console.WriteLine($"Routing MVID: {assembly.ManifestModule.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var scenario in DfaLiteralBuildBenchmark.Cases)
    {
        var benchmark = new DfaLiteralBuildBenchmark { Case = scenario };
        benchmark.Setup();
        benchmark.Cleanup();
    }
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
