using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Owin;

var assembly = typeof(OwinEnvironment).Assembly;
Console.WriteLine($"Owin assembly: {assembly.Location}");
Console.WriteLine($"Owin MVID: {assembly.ManifestModule.ModuleVersionId}");
if (args is ["--verify-storage"])
{
    Console.WriteLine(JsonSerializer.Serialize(OwinFeatureMapBenchmark.VerifyStorage()));
    return;
}
if (args is ["--verify-setups"])
{
    foreach (var scenario in OwinFeatureMapBenchmark.Cases)
    {
        var benchmark = new OwinFeatureMapBenchmark { Case = scenario };
        try
        {
            benchmark.Setup();
        }
        finally
        {
            benchmark.Cleanup();
        }
    }
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
