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
| **FlushAndConsumeAsync** |   **Live.Async.Started** |      **24.57 ns** |      **1.002 ns** |      **0.524 ns** |     **-** |     **-** |     **-** |         **-** |
| **FlushAndConsumeAsync** |    **Live.Sync.Started** |      **20.52 ns** |      **0.467 ns** |      **0.244 ns** |     **-** |     **-** |     **-** |         **-** |
| **FlushAndConsumeAsync** | **Reque(...)ady.1 [21]** | **370,745.54 ns** | **79,173.598 ns** | **41,409.323 ns** |     **-** |     **-** |     **-** |  **11,032 B** |
| **FlushAndConsumeAsync** |  **Request.Sync.None.1** | **311,031.64 ns** | **56,492.670 ns** | **29,546.759 ns** |     **-** |     **-** |     **-** |  **10,509 B** |
| **FlushAndConsumeAsync** | **Request.Sync.Ready.1** | **276,060.87 ns** | **31,102.698 ns** | **16,267.313 ns** |     **-** |     **-** |     **-** |  **11,359 B** |
| **FlushAndConsumeAsync** | **Reque(...)dy.64 [21]** | **279,755.95 ns** | **44,290.741 ns** | **23,164.914 ns** |     **-** |     **-** |     **-** |  **11,334 B** |
