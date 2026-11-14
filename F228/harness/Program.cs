using System.Reflection;
using System.Text.Json;
using BenchmarkDotNet.Running;

var assembly = Assembly.Load("Microsoft.AspNetCore.Grpc.JsonTranscoding");
Console.WriteLine($"Transcoding assembly: {assembly.Location}");
Console.WriteLine($"Transcoding MVID: {assembly.ManifestModule.ModuleVersionId}");
if (args is ["--audit-callers"])
{
    Console.WriteLine(JsonSerializer.Serialize(CallerAudit.Scan(assembly), new JsonSerializerOptions { WriteIndented = true }));
    return;
}
if (args is ["--verify-setups"])
{
    foreach (var scenario in QueryMembershipBenchmark.Cases)
    {
        new QueryMembershipBenchmark { Case = scenario }.Setup();
    }
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
