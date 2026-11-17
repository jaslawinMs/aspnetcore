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
| **WriteAndConsumeAsync** | **Live.(...).Zero [23]** |      **26.45 ns** |      **0.464 ns** |      **0.243 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Live.(...).Zero [22]** |      **20.10 ns** |      **0.211 ns** |      **0.111 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [23]** | **360,149.58 ns** | **89,035.333 ns** | **46,567.201 ns** |     **-** |     **-** |     **-** |  **11,430 B** |
| **WriteAndConsumeAsync** | **Reque(...)e.128 [21]** | **326,562.74 ns** | **47,608.258 ns** | **24,900.040 ns** |     **-** |     **-** |     **-** |  **10,654 B** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [22]** | **269,860.85 ns** | **34,298.026 ns** | **17,938.531 ns** |     **-** |     **-** |     **-** |  **11,582 B** |
| **WriteAndConsumeAsync** | **Reque(...).4096 [23]** | **328,359.20 ns** | **36,425.311 ns** | **19,051.142 ns** |     **-** |     **-** |     **-** |  **19,518 B** |
