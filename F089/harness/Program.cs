using System.Security.Cryptography;
using AutoPerf;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var assembly = typeof(WebAssemblyHostBuilder).Assembly;
Console.WriteLine($"F089 owner: {assembly.Location}");
Console.WriteLine($"F089 owner SHA256: {Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location)))}");
Console.WriteLine($"F089 owner MVID: {assembly.ManifestModule.ModuleVersionId}");

if (args is ["--verify-setups"])
{
    foreach (var profile in HashDelimiterBenchmark.Profiles)
    {
        var fixture = new HashDelimiterBenchmark { Profile = profile };
        fixture.SetupManual();
        if (!fixture.ActualNoImportOwner().IsCompletedSuccessfully ||
            fixture.DirectStringDiagnostic() != fixture.ExpectedIndex ||
            fixture.DirectCharDiagnostic() != fixture.ExpectedIndex)
        {
            throw new InvalidOperationException($"Actual owner or delimiter control failed: {profile}");
        }
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.Success && report.ResultStatistics is { N: > 0 })) ? 0 : 1;
