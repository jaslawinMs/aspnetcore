using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Running;

OwnerProbe.Verify();
if (args is ["--capture-oracles", var output])
{
    var contracts = Corpus.Cases.Select(name =>
    {
        using var workload = new SectionWorkload(name);
        return Contracts.VerifyTwice(workload);
    }).ToArray();
    File.WriteAllText(output, JsonSerializer.Serialize(contracts));
    Console.WriteLine($"Captured {contracts.Length} contracts from {contracts.Length * 2} complete original workloads.");
}
else if (args is ["--verify-setups"])
{
    foreach (var name in Corpus.Cases)
    {
        using var workload = new SectionWorkload(name);
        var contract = Contracts.VerifyTwice(workload);
        Contracts.VerifyOriginal(contract);
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(contract));
    }
    Console.WriteLine($"Verified {Corpus.Cases.Length} setups/{Corpus.Cases.Length * 2} actual complete workloads.");
}
else
{
    BenchmarkSwitcher.FromAssembly(typeof(RazorSectionBenchmark).Assembly).Run(args);
}
