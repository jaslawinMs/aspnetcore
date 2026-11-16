using System.Security.Cryptography;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Components.AI;

var owner = typeof(MessageListContext).Assembly.Location;
Console.WriteLine($"F088 owner: {owner}");
Console.WriteLine($"F088 owner SHA256: {Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(owner)))}");
Console.WriteLine($"F088 owner MVID: {typeof(MessageListContext).Module.ModuleVersionId}");

if (args is ["--capture-oracles", var destination])
{
    var states = new List<CaseState>();
    foreach (var definition in TableFixture.Definitions)
    {
        using var fixture = new TableFixture(definition.Name);
        states.Add(await fixture.CaptureAsync());
        var repeated = await fixture.CaptureAsync();
        if (JsonSerializer.Serialize(states[^1]) != JsonSerializer.Serialize(repeated))
        {
            throw new InvalidOperationException($"Original producer/render state is not repeatable: {definition.Name}");
        }
    }
    File.WriteAllText(destination, JsonSerializer.Serialize(states, TableFixture.JsonOptions));
    Console.WriteLine($"Captured {states.Count} actual producer/render contract oracles.");

    return 0;
}

if (args is ["--verify-setups"])
{
    foreach (var definition in TableFixture.Definitions)
    {
        using var fixture = new TableFixture(definition.Name);
        await fixture.InitializeAsync();
    }

    return 0;
}

var config = ManualConfig.Create(DefaultConfig.Instance).AddDiagnoser(MemoryDiagnoser.Default);
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config).ToArray();

return summaries.Length != 0 && summaries.All(summary =>
    !summary.HasCriticalValidationErrors && summary.Reports.Any() &&
    summary.Reports.All(report => report.Success && report.ResultStatistics is { N: > 0 })) ? 0 : 1;
