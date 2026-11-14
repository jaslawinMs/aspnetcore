using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using AutoPerf;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;

Console.WriteLine($"Kestrel assembly: {HeaderAccess.Owner.Location}");
Console.WriteLine($"Kestrel MVID: {HeaderAccess.Owner.ManifestModule.ModuleVersionId}");
using (var stream = File.OpenRead(HeaderAccess.Owner.Location))
using (var reader = new PEReader(stream))
{
    var metadata = reader.GetMetadataReader();
    if (metadata.GetGuid(metadata.GetModuleDefinition().Mvid) != HeaderAccess.Owner.ManifestModule.ModuleVersionId)
    {
        throw new InvalidOperationException("Loaded Kestrel owner does not match PE module.");
    }
}

if (args is ["--verify-setups"])
{
    foreach (var name in new CookieMergeBenchmark().Cases)
    {
        new CookieMergeBenchmark { Case = name }.Setup();
        Console.WriteLine($"Verified setup: {name}");
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.AllMeasurements.Any())) ? 0 : 1;
