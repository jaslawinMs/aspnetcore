using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Components.AI;

Console.WriteLine($"Components.AI assembly: {typeof(UIAgent).Assembly.Location}");
Console.WriteLine($"Components.AI MVID: {typeof(UIAgent).Module.ModuleVersionId}");
using (var stream = File.OpenRead(typeof(UIAgent).Assembly.Location))
using (var reader = new PEReader(stream))
{
    var metadata = reader.GetMetadataReader();
    if (metadata.GetGuid(metadata.GetModuleDefinition().Mvid) != typeof(UIAgent).Module.ModuleVersionId)
    {
        throw new InvalidOperationException("Actual owning AI assembly differs from its PE module.");
    }
}

if (args is ["--capture-oracles", var destination])
{
    var receipts = new List<CaseReceipt>();
    foreach (var definition in StreamingWorkload.Definitions)
    {
        var workload = new StreamingWorkload(definition.Name);
        receipts.Add(await workload.CaptureAsync());
        await workload.VerifyRepeatedAsync(receipts[^1]);
    }
    File.WriteAllText(destination, JsonSerializer.Serialize(receipts, StreamingWorkload.JsonOptions));

    return 0;
}
if (args is ["--verify-setups"])
{
    foreach (var definition in StreamingWorkload.Definitions)
    {
        var workload = new StreamingWorkload(definition.Name);
        await workload.InitializeAsync();
        Console.WriteLine("Verified setup: " + definition.Name);
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
