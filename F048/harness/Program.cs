using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.WebUtilities;

Console.WriteLine($"WebUtilities assembly: {typeof(MultipartReader).Assembly.Location}");
Console.WriteLine($"WebUtilities MVID: {typeof(MultipartReader).Module.ModuleVersionId}");
using (var stream = File.OpenRead(typeof(MultipartReader).Assembly.Location))
using (var reader = new PEReader(stream))
{
    var metadata = reader.GetMetadataReader();
    if (metadata.GetGuid(metadata.GetModuleDefinition().Mvid) != typeof(MultipartReader).Module.ModuleVersionId)
    {
        throw new InvalidOperationException("Actual owning WebUtilities assembly differs from its PE module.");
    }
}

if (args is ["--capture-oracles", var destination])
{
    var receipts = new List<CaseReceipt>();
    foreach (var definition in MultipartWorkload.Definitions)
    {
        using var workload = new MultipartWorkload(definition.Name);
        receipts.Add(await workload.CaptureAsync());
    }
    File.WriteAllText(destination, JsonSerializer.Serialize(receipts, new JsonSerializerOptions { WriteIndented = true }));

    return 0;
}
if (args is ["--verify-setups"])
{
    foreach (var definition in MultipartWorkload.Definitions)
    {
        using var workload = new MultipartWorkload(definition.Name);
        await workload.InitializeAsync();
        await workload.VerifyAsync();
        Console.WriteLine("Verified setup: " + definition.Name);
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
