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
| **FlushAndConsumeAsync** |   **Live.Async.Started** |      **24.12 ns** |      **0.246 ns** |      **0.129 ns** |     **-** |     **-** |     **-** |         **-** |
| **FlushAndConsumeAsync** |    **Live.Sync.Started** |      **20.15 ns** |      **0.190 ns** |      **0.099 ns** |     **-** |     **-** |     **-** |         **-** |
| **FlushAndConsumeAsync** | **Reque(...)ady.1 [21]** | **339,719.87 ns** | **45,505.294 ns** | **23,800.149 ns** |     **-** |     **-** |     **-** |  **11,111 B** |
| **FlushAndConsumeAsync** |  **Request.Sync.None.1** | **307,472.52 ns** | **41,760.737 ns** | **21,841.673 ns** |     **-** |     **-** |     **-** |  **10,429 B** |
| **FlushAndConsumeAsync** | **Request.Sync.Ready.1** | **267,076.39 ns** | **46,622.350 ns** | **24,384.391 ns** |     **-** |     **-** |     **-** |  **11,330 B** |
| **FlushAndConsumeAsync** | **Reque(...)dy.64 [21]** | **257,346.29 ns** | **33,373.324 ns** | **17,454.894 ns** |     **-** |     **-** |     **-** |  **11,356 B** |
