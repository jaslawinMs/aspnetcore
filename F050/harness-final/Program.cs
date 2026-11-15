using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.Formatters;

Console.WriteLine($"Mvc.Core assembly: {typeof(MediaType).Assembly.Location}");
Console.WriteLine($"Mvc.Core MVID: {typeof(MediaType).Module.ModuleVersionId}");
using (var stream = File.OpenRead(typeof(MediaType).Assembly.Location))
using (var reader = new PEReader(stream))
{
    var metadata = reader.GetMetadataReader();
    if (metadata.GetGuid(metadata.GetModuleDefinition().Mvid) != typeof(MediaType).Module.ModuleVersionId)
    {
        throw new InvalidOperationException("Loaded Mvc.Core differs from its actual PE module.");
    }
}

if (args is ["--capture-oracles", var destination])
{
    var receipts = new List<CaseReceipt>();
    foreach (var definition in AcceptWorkload.Definitions)
    {
        var workload = new AcceptWorkload(definition.Name);
        workload.Run();
        receipts.Add(workload.Capture());
    }
    var oracle = new ContractOracle(AcceptWorkload.OwnerHash, receipts.ToArray());
    File.WriteAllText(destination, JsonSerializer.Serialize(oracle, AcceptWorkload.JsonOptions));

    return 0;
}
if (args is ["--verify-setups"])
{
    foreach (var definition in AcceptWorkload.Definitions)
    {
        new AcceptWorkload(definition.Name).Verify();
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
