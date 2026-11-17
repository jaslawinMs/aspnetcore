``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F032  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|               Method |              Profile |          Mean |         Error |        StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------- |--------------------- |--------------:|--------------:|--------------:|------:|------:|------:|----------:|
| **FlushAndConsumeAsync** |   **Live.Async.Started** |      **24.09 ns** |      **0.420 ns** |      **0.220 ns** |     **-** |     **-** |     **-** |         **-** |
| **FlushAndConsumeAsync** |    **Live.Sync.Started** |      **20.37 ns** |      **0.588 ns** |      **0.307 ns** |     **-** |     **-** |     **-** |         **-** |
| **FlushAndConsumeAsync** | **Reque(...)ady.1 [21]** | **341,351.46 ns** | **51,376.226 ns** | **26,870.760 ns** |     **-** |     **-** |     **-** |  **11,026 B** |
| **FlushAndConsumeAsync** |  **Request.Sync.None.1** | **290,628.59 ns** | **52,335.778 ns** | **27,372.624 ns** |     **-** |     **-** |     **-** |  **10,502 B** |
| **FlushAndConsumeAsync** | **Request.Sync.Ready.1** | **255,068.80 ns** | **30,837.810 ns** | **16,128.771 ns** |     **-** |     **-** |     **-** |  **11,325 B** |
| **FlushAndConsumeAsync** | **Reque(...)dy.64 [21]** | **257,210.63 ns** | **27,985.040 ns** | **14,636.717 ns** |     **-** |     **-** |     **-** |  **11,327 B** |
