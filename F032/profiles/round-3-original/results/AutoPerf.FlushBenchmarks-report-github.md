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
| **FlushAndConsumeAsync** |   **Live.Async.Started** |      **24.23 ns** |      **0.203 ns** |      **0.106 ns** |     **-** |     **-** |     **-** |         **-** |
| **FlushAndConsumeAsync** |    **Live.Sync.Started** |      **20.28 ns** |      **0.126 ns** |      **0.066 ns** |     **-** |     **-** |     **-** |         **-** |
| **FlushAndConsumeAsync** | **Reque(...)ady.1 [21]** | **386,460.66 ns** | **46,595.600 ns** | **24,370.400 ns** |     **-** |     **-** |     **-** |  **11,022 B** |
| **FlushAndConsumeAsync** |  **Request.Sync.None.1** | **269,665.86 ns** | **68,614.797 ns** | **35,886.866 ns** |     **-** |     **-** |     **-** |  **10,568 B** |
| **FlushAndConsumeAsync** | **Request.Sync.Ready.1** | **249,645.50 ns** | **30,556.060 ns** | **15,981.410 ns** |     **-** |     **-** |     **-** |  **11,311 B** |
| **FlushAndConsumeAsync** | **Reque(...)dy.64 [21]** | **255,611.28 ns** | **23,369.376 ns** | **12,222.635 ns** |     **-** |     **-** |     **-** |  **11,302 B** |
