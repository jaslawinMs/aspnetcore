using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using CodeGenerator;

Console.WriteLine($"CodeGenerator assembly: {typeof(KnownHeaders).Assembly.Location}");
Console.WriteLine($"CodeGenerator MVID: {typeof(KnownHeaders).Module.ModuleVersionId}");
using (var stream = File.OpenRead(typeof(KnownHeaders).Assembly.Location))
using (var reader = new PEReader(stream))
{
    var metadata = reader.GetMetadataReader();
    if (metadata.GetGuid(metadata.GetModuleDefinition().Mvid) != typeof(KnownHeaders).Module.ModuleVersionId)
    {
        throw new InvalidOperationException("Actual CodeGenerator owner does not match its PE module.");
    }
}

var initialHeaders = KnownHeaders.ResponseHeaders.Concat(KnownHeaders.ResponseTrailers)
    .Select(header => new { header.Name, header.BytesOffset, header.BytesCount }).ToArray();
Console.WriteLine("Initial header state: " + JsonSerializer.Serialize(initialHeaders));
if (initialHeaders.Any(header => header.BytesOffset != 0 || header.BytesCount != 0))
{
    throw new InvalidOperationException("Actual fresh owner header defaults differ from the original zero state.");
}

if (args is ["--capture-oracles", var destination])
{
    var receipts = new List<GenerationReceipt>();
    foreach (var name in new HeaderGenerationBenchmark().Cases)
    {
        using var benchmark = new HeaderGenerationBenchmark { Case = name };
        receipts.Add(benchmark.Capture());
    }
    File.WriteAllText(destination, JsonSerializer.Serialize(receipts, new JsonSerializerOptions { WriteIndented = true }));

    return 0;
}
if (args is ["--verify-setups"])
{
    foreach (var name in new HeaderGenerationBenchmark().Cases)
    {
        using var benchmark = new HeaderGenerationBenchmark { Case = name };
        benchmark.Setup();
        Console.WriteLine($"Verified setup: {name}");
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
