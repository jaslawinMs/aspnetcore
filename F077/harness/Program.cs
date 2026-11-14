using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.JsonPatch;
using JsonSerializer = System.Text.Json.JsonSerializer;

Console.WriteLine($"JsonPatch assembly: {typeof(JsonPatchDocument).Assembly.Location}");
Console.WriteLine($"JsonPatch MVID: {typeof(JsonPatchDocument).Module.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var name in new NewtonsoftPatchBenchmark().Cases)
    {
        var benchmark = new NewtonsoftPatchBenchmark { Case = name };
        benchmark.Setup();
        Console.WriteLine($"Verified setup: {name}");
        Console.WriteLine("Contract receipt: " + JsonSerializer.Serialize(new
        {
            name,
            operations = benchmark.VerifiedOperations,
            incoming_type = benchmark.VerifiedIncomingType,
            output_sha256 = benchmark.VerifiedOutputHash,
            complete_output = benchmark.VerifiedOutput,
            independent_copy = benchmark.VerifiedIndependentCopy,
        }));
    }

    return 0;
}

if (args is ["--verify-contracts"])
{
    var receipts = ConversionContractProbe.Run();
    foreach (var receipt in receipts)
    {
        Console.WriteLine("Compatibility receipt: " + JsonSerializer.Serialize(receipt));
    }

    return receipts.All(receipt => receipt.compatible) ? 0 : 1;
}

var config = ManualConfig.Create(DefaultConfig.Instance)
    .AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors &&
    summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
