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
| **WriteAndConsumeAsync** | **Live.(...).Zero [23]** |      **27.73 ns** |      **3.935 ns** |      **2.058 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Live.(...).Zero [22]** |      **19.88 ns** |      **0.241 ns** |      **0.126 ns** |     **-** |     **-** |     **-** |         **-** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [23]** | **360,254.56 ns** | **70,481.179 ns** | **36,863.019 ns** |     **-** |     **-** |     **-** |  **11,492 B** |
| **WriteAndConsumeAsync** | **Reque(...)e.128 [21]** | **299,697.99 ns** | **56,248.253 ns** | **29,418.924 ns** |     **-** |     **-** |     **-** |  **10,715 B** |
| **WriteAndConsumeAsync** | **Reque(...)y.128 [22]** | **259,733.37 ns** | **28,977.711 ns** | **15,155.903 ns** |     **-** |     **-** |     **-** |  **11,572 B** |
| **WriteAndConsumeAsync** | **Reque(...).4096 [23]** | **333,522.87 ns** | **41,051.399 ns** | **21,470.676 ns** |     **-** |     **-** |     **-** |  **19,504 B** |
