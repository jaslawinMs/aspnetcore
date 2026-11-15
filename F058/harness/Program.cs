using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Running;

OwnerProbe.Verify();
if (args is ["--capture-oracles", var output])
{
    var contracts = Corpus.Cases.Select(name => Contracts.VerifyTwice(new HeaderWorkload(name))).ToArray();
    File.WriteAllText(output, JsonSerializer.Serialize(contracts));
    Console.WriteLine($"Captured {contracts.Length} contracts from {contracts.Length * 2} complete original workloads.");
}
else if (args is ["--verify-setups"])
{
    foreach (var name in Corpus.Cases)
    {
        var contract = Contracts.VerifyTwice(new HeaderWorkload(name));
        Contracts.VerifyOriginal(contract);
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(contract));
    }
    Console.WriteLine($"Verified {Corpus.Cases.Length} setups/{Corpus.Cases.Length * 2} actual complete workloads.");
}
else if (args is ["--probe-resources"])
{
    foreach (var name in Corpus.ResourceCases)
    {
        var workload = new HeaderWorkload(name);
        var checksum = 0;
        for (var i = 0; i < 100000; i++)
        {
            checksum ^= workload.Run() is null ? 0 : 1;
        }
        var observations = new long[3];
        for (var sample = 0; sample < observations.Length; sample++)
        {
            var before = GC.GetAllocatedBytesForCurrentThread();
            for (var i = 0; i < 100000; i++)
            {
                checksum ^= workload.Run() is null ? 0 : 1;
            }
            observations[sample] = GC.GetAllocatedBytesForCurrentThread() - before;
        }
        Console.WriteLine("AUTOPERF_RESOURCE " + JsonSerializer.Serialize(new
        {
            Case = name, OperationsPerSample = 100000, AllocatedBytes = observations, Checksum = checksum
        }));
    }
}
else
{
    BenchmarkSwitcher.FromAssembly(typeof(ObjectCollectionBenchmark).Assembly).Run(args);
}
