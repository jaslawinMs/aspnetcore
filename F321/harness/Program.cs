using System.Reflection;
using System.Text.Json;
using BenchmarkDotNet.Running;

var owner = Assembly.Load("Microsoft.AspNetCore.Grpc.JsonTranscoding");
Console.WriteLine($"Transcoding assembly: {owner.Location}");
Console.WriteLine($"Transcoding MVID: {owner.ManifestModule.ModuleVersionId}");
if (args is ["--audit-owner"])
{
    Console.WriteLine("OwnerAudit " + JsonSerializer.Serialize(CallerAudit.Scan(owner)));
    return;
}
if (args is ["--verify-setups"])
{
    foreach (var scenario in RequestParameterBenchmark.Cases)
    {
        new RequestParameterBenchmark { Case = scenario }.Setup();
    }
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
