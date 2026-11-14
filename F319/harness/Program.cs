using System.Reflection;
using BenchmarkDotNet.Running;

var assembly = Assembly.Load("Microsoft.AspNetCore.Grpc.JsonTranscoding");
Console.WriteLine($"Transcoding assembly: {assembly.Location}");
Console.WriteLine($"Transcoding MVID: {assembly.ManifestModule.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var scenario in ServiceDescriptorStartupBenchmark.Cases)
    {
        new ServiceDescriptorStartupBenchmark { Case = scenario }.Setup();
    }
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
