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
| **WriteAndConsumeAsync** | **Live.(...).Zero [23]** |      **26.36 ns** |      **0.365 ns** |      **0.191 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Live.(...).Zero [22]** |      **19.97 ns** |      **0.134 ns** |      **0.070 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [23]** | **338,325.12 ns** | **30,317.208 ns** | **15,856.486 ns** |     **-** |     **-** |     **-** |  **11,541 B** |
| **WriteAndConsumeAsync** | **Reque(...)e.128 [21]** | **248,053.39 ns** | **30,054.746 ns** | **15,719.213 ns** |     **-** |     **-** |     **-** |  **10,725 B** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [22]** | **254,446.76 ns** | **19,197.944 ns** | **10,040.896 ns** |     **-** |     **-** |     **-** |  **11,538 B** |
| **WriteAndConsumeAsync** | **Reque(...).4096 [23]** | **329,073.84 ns** | **34,910.120 ns** | **18,258.668 ns** |     **-** |     **-** |     **-** |  **19,507 B** |
