using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Routing.Constraints;
using System.Text.Json;

Console.WriteLine($"Routing assembly: {typeof(MaxRouteConstraint).Assembly.Location}");
Console.WriteLine($"Routing MVID: {typeof(MaxRouteConstraint).Module.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var name in new MaxRouteConstraintBenchmark().Cases)
    {
        var benchmark = new MaxRouteConstraintBenchmark { Case = name };
        benchmark.Setup();
        Console.WriteLine($"Verified setup: {name}");
        Console.WriteLine("Contract receipt: " + JsonSerializer.Serialize(new
        {
            name,
            producer = benchmark.VerifiedProducer,
            route_value_type = benchmark.VerifiedValueType,
            result = benchmark.VerifiedResult,
            input_object_preserved = benchmark.VerifiedInputPreserved,
            complete_link_path = benchmark.VerifiedPath,
            invariant_formattable_provider = benchmark.VerifiedInvariantProvider,
        }));
        benchmark.Cleanup();
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
