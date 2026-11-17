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
| **WriteAndConsumeAsync** | **Live.(...).Zero [23]** |      **26.46 ns** |      **0.338 ns** |      **0.177 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Live.(...).Zero [22]** |      **20.19 ns** |      **0.179 ns** |      **0.094 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [23]** | **334,944.65 ns** | **39,803.995 ns** | **20,818.259 ns** |     **-** |     **-** |     **-** |  **11,401 B** |
| **WriteAndConsumeAsync** | **Reque(...)e.128 [21]** | **306,634.75 ns** | **28,087.741 ns** | **14,690.432 ns** |     **-** |     **-** |     **-** |  **10,687 B** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [22]** | **255,816.73 ns** | **25,286.517 ns** | **13,225.337 ns** |     **-** |     **-** |     **-** |  **11,512 B** |
| **WriteAndConsumeAsync** | **Reque(...).4096 [23]** | **332,885.52 ns** | **34,989.490 ns** | **18,300.180 ns** |     **-** |     **-** |     **-** |  **19,520 B** |
