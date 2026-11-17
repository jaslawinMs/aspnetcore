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
| **WriteAndConsumeAsync** | **Live.(...).Zero [23]** |      **26.44 ns** |      **0.357 ns** |      **0.187 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Live.(...).Zero [22]** |      **19.87 ns** |      **0.314 ns** |      **0.164 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [23]** | **339,280.32 ns** | **51,108.043 ns** | **26,730.495 ns** |     **-** |     **-** |     **-** |  **11,429 B** |
| **WriteAndConsumeAsync** | **Reque(...)e.128 [21]** | **290,270.25 ns** | **36,585.314 ns** | **19,134.827 ns** |     **-** |     **-** |     **-** |  **10,730 B** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [22]** | **282,944.47 ns** | **29,222.332 ns** | **15,283.845 ns** |     **-** |     **-** |     **-** |  **11,561 B** |
| **WriteAndConsumeAsync** | **Reque(...).4096 [23]** | **330,230.97 ns** | **57,038.344 ns** | **29,832.157 ns** |     **-** |     **-** |     **-** |  **19,494 B** |
