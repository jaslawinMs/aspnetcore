using AutoPerf;
using BenchmarkDotNet.Running;

OwnerProbe.Verify();
if (args is ["--verify-public-contracts", var output])
{
    await PublicContracts.Verify(output);
}
else if (args is ["--verify-retention", var retentionOutput])
{
    RetentionProbe.Verify(retentionOutput);
}
else
{
    BenchmarkSwitcher.FromAssembly(typeof(ProxyRequestBenchmark).Assembly).Run(args);
}
