``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F033  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|               Method |              Profile |          Mean |         Error |        StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------- |--------------------- |--------------:|--------------:|--------------:|------:|------:|------:|----------:|
| **WriteAndConsumeAsync** | **Live.(...).Zero [23]** |      **26.86 ns** |      **1.690 ns** |      **0.884 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Live.(...).Zero [22]** |      **20.45 ns** |      **1.508 ns** |      **0.789 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [23]** | **356,516.90 ns** | **45,339.523 ns** | **23,713.447 ns** |     **-** |     **-** |     **-** |  **11,365 B** |
| **WriteAndConsumeAsync** | **Reque(...)e.128 [21]** | **327,877.20 ns** | **43,242.310 ns** | **22,616.564 ns** |     **-** |     **-** |     **-** |  **10,720 B** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [22]** | **269,501.34 ns** | **34,129.546 ns** | **17,850.413 ns** |     **-** |     **-** |     **-** |  **11,519 B** |
| **WriteAndConsumeAsync** | **Reque(...).4096 [23]** | **342,643.71 ns** | **30,151.276 ns** | **15,769.700 ns** |     **-** |     **-** |     **-** |  **19,505 B** |
