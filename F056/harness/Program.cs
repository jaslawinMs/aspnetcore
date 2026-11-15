using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Authorization;

Console.WriteLine($"Authorization assembly: {typeof(DefaultAuthorizationService).Assembly.Location}");
Console.WriteLine($"Authorization MVID: {typeof(DefaultAuthorizationService).Module.ModuleVersionId}");
using (var stream = File.OpenRead(typeof(DefaultAuthorizationService).Assembly.Location))
using (var reader = new PEReader(stream))
{
    var metadata = reader.GetMetadataReader();
    if (metadata.GetGuid(metadata.GetModuleDefinition().Mvid) != typeof(DefaultAuthorizationService).Module.ModuleVersionId ||
        Path.GetDirectoryName(typeof(DefaultAuthorizationService).Assembly.Location) != AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar))
    {
        throw new InvalidOperationException("Actual owning assembly differs from the frozen local PE module.");
    }
}

if (args is ["--capture-oracles", var destination])
{
    var receipts = new List<RequirementsReceipt>();
    foreach (var definition in RequirementsWorkload.Definitions)
    {
        using var workload = new RequirementsWorkload(definition.Name);
        receipts.Add(await workload.CaptureAsync());
        await workload.VerifyTwiceAsync(receipts[^1]);
    }
    File.WriteAllText(destination, JsonSerializer.Serialize(receipts, RequirementsWorkload.JsonOptions));

    return 0;
}
if (args is ["--verify-setups"])
{
    foreach (var definition in RequirementsWorkload.Definitions)
    {
        using var workload = new RequirementsWorkload(definition.Name);
        await workload.InitializeAsync();
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
