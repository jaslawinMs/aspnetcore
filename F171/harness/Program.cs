using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Owin;

var assembly = typeof(OwinEnvironment).Assembly;
Console.WriteLine($"Owin assembly: {assembly.Location}");
Console.WriteLine($"Owin MVID: {assembly.ManifestModule.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var scenario in CancellationDefaultBenchmark.Cases)
    {
        var benchmark = new CancellationDefaultBenchmark { Case = scenario };
        benchmark.Setup();
        benchmark.Cleanup();
    }
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
