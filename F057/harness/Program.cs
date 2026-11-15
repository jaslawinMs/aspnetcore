using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Running;

OwnerProbe.Verify();
Console.WriteLine("AUTOPERF_OWNER " + JsonSerializer.Serialize(new
{
    Path = OwnerProbe.Assembly.Location,
    Mvid = OwnerProbe.Assembly.ManifestModule.ModuleVersionId,
    MethodToken = OwnerProbe.Method.MetadataToken,
    MethodIl = Convert.ToHexString(OwnerProbe.Method.GetMethodBody()?.GetILAsByteArray()
        ?? throw new InvalidOperationException("Actual owner method IL missing."))
}));

if (args.Length == 2 && args[0] == "--capture-oracles")
{
    var contracts = new List<WorkloadContract>();
    foreach (var name in Corpus.Cases)
    {
        using var workload = Corpus.Create(name);
        var contract = Contracts.VerifyTwice(workload);
        contracts.Add(contract);
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(contract, Contracts.Options));
    }
    File.WriteAllText(args[1], JsonSerializer.Serialize(contracts, Contracts.Options));
    Console.WriteLine($"Captured {contracts.Count} original contracts from {contracts.Count * 2} actual complete workloads.");
}
else if (args.Length == 1 && args[0] == "--verify-setups")
{
    foreach (var name in Corpus.Cases)
    {
        using var workload = Corpus.Create(name);
        var contract = Contracts.VerifyTwice(workload);
        Contracts.VerifyOriginal(contract);
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(contract, Contracts.Options));
    }
    Console.WriteLine($"Verified {Corpus.Cases.Length} original contracts and {Corpus.Cases.Length * 2} actual repeated workloads.");
}
else if (args.Length == 1 && args[0] == "--probe-resources")
{
    foreach (var name in Corpus.Cases.Where(name => !name.StartsWith("Cascade_", StringComparison.Ordinal)))
    {
        using var workload = Corpus.Create(name);
        Contracts.VerifyOriginal(Contracts.VerifyTwice(workload));
        var checksum = 0L;
        for (var i = 0; i < 100_000; i++)
        {
            checksum += workload.Run();
        }
        var observations = new List<long>();
        for (var sample = 0; sample < 3; sample++)
        {
            var start = GC.GetAllocatedBytesForCurrentThread();
            for (var i = 0; i < 100_000; i++)
            {
                checksum += workload.Run();
            }
            observations.Add(GC.GetAllocatedBytesForCurrentThread() - start);
        }
        Console.WriteLine("AUTOPERF_RESOURCE " + JsonSerializer.Serialize(new
        {
            Case = name, OperationsPerSample = 100_000, AllocatedBytes = observations, Checksum = checksum,
            Boundary = "Complete real helper/comparer;not attribution of downstream boxing to null checks"
        }));
    }
}
else
{
    BenchmarkSwitcher.FromAssembly(typeof(ChangeDetectionBenchmark).Assembly).Run(args);
}
