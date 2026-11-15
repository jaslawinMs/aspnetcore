using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Running;

OwnerProbe.Verify();
if (args is ["--capture-oracles", var output])
{
    var contracts = Corpus.Cases.Select(recipe => Contracts.VerifyTwice(new CookieWorkload(recipe))).ToArray();
    File.WriteAllText(output, JsonSerializer.Serialize(contracts));
    Console.WriteLine($"Captured {contracts.Length} original contracts/{contracts.Length * 2} actual workloads.");
}
else if (args is ["--verify-setups"])
{
    foreach (var recipe in Corpus.Cases)
    {
        var contract = Contracts.VerifyTwice(new CookieWorkload(recipe));
        Contracts.VerifyOriginal(contract);
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(contract));
    }
    Console.WriteLine($"Verified {Corpus.Cases.Length} setups/{Corpus.Cases.Length * 2} actual workloads.");
}
else
{
    BenchmarkSwitcher.FromAssembly(typeof(CookieDeleteBenchmark).Assembly).Run(args);
}
