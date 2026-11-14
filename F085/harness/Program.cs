using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Server.Kestrel.Core;

Console.WriteLine($"Kestrel assembly: {typeof(KestrelServerOptions).Assembly.Location}");
Console.WriteLine($"Kestrel MVID: {typeof(KestrelServerOptions).Module.ModuleVersionId}");
using (var stream = File.OpenRead(typeof(KestrelServerOptions).Assembly.Location))
using (var reader = new PEReader(stream))
{
    var metadata = reader.GetMetadataReader();
    if (metadata.GetGuid(metadata.GetModuleDefinition().Mvid) != typeof(KestrelServerOptions).Module.ModuleVersionId)
    {
        throw new InvalidOperationException("Actual owning Kestrel assembly differs from its PE module.");
    }
}

if (args is ["--capture-oracles", var destination])
{
    var receipts = new List<CaseReceipt>();
    foreach (var name in new MethodLookupBenchmark().Cases)
    {
        var benchmark = new MethodLookupBenchmark { Case = name };
        receipts.Add(benchmark.Capture());
    }
    var oracle = new Oracle(MethodAccess.CaptureSlots(), receipts.ToArray());
    File.WriteAllText(destination, JsonSerializer.Serialize(oracle, new JsonSerializerOptions { WriteIndented = true }));

    return 0;
}
if (args is ["--verify-setups"])
{
    foreach (var name in new MethodLookupBenchmark().Cases)
    {
        var benchmark = new MethodLookupBenchmark { Case = name };
        benchmark.Setup();
        Console.WriteLine("Verified setup: " + name);
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
