using System.Text.Json;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.Extensions.DependencyInjection;

Console.WriteLine($"NewtonsoftJson assembly: {typeof(NewtonsoftJsonMvcCoreBuilderExtensions).Assembly.Location}");
Console.WriteLine($"NewtonsoftJson MVID: {typeof(NewtonsoftJsonMvcCoreBuilderExtensions).Module.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var name in new BsonTempDataBenchmark().Cases)
    {
        var benchmark = new BsonTempDataBenchmark { Case = name };
        try
        {
            benchmark.Setup();
            Console.WriteLine($"Verified setup: {name}");
            Console.WriteLine("Contract receipt: " + JsonSerializer.Serialize(new
            {
                name,
                payload_bytes = benchmark.VerifiedLength,
                payload_sha256 = benchmark.VerifiedHash,
                complete_round_trip = benchmark.VerifiedRoundTrip,
                cookie_producer = benchmark.VerifiedCookieProducer,
            }));
        }
        finally
        {
            benchmark.Cleanup();
        }
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance)
    .AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors &&
    summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
