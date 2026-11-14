using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Owin;

var assembly = typeof(OwinEnvironment).Assembly;
Console.WriteLine($"Owin assembly: {assembly.Location}");
Console.WriteLine($"Owin MVID: {assembly.ManifestModule.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var scenario in VersionDefaultBenchmark.Cases)
    {
        var benchmark = new VersionDefaultBenchmark { Case = scenario };
        benchmark.Setup();
    }
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
