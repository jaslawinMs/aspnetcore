``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F042  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|          Method | Count |              Profile |     Mean |    Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |------ |--------------------- |---------:|---------:|---------:|-------:|------:|------:|----------:|
| **ApplyAndObserve** |     **1** |    **ParsedIntExisting** | **778.9 ns** | **42.49 ns** | **22.22 ns** | **0.0149** |     **-** |     **-** |     **637 B** |
| **ApplyAndObserve** |     **1** | **ParsedObjectExisting** | **697.7 ns** | **29.70 ns** | **15.53 ns** | **0.0075** |     **-** |     **-** |     **591 B** |
| **ApplyAndObserve** |     **1** |  **ParsedObjectMissing** | **898.0 ns** | **37.93 ns** | **19.84 ns** | **0.0177** |     **-** |     **-** |     **775 B** |
| **ApplyAndObserve** |     **1** | **Parse(...)ntrol [23]** | **803.7 ns** | **41.01 ns** | **21.45 ns** | **0.0146** |     **-** |     **-** |     **590 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [23]** | **700.4 ns** | **34.95 ns** | **18.28 ns** | **0.0139** |     **-** |     **-** |     **588 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [24]** | **731.9 ns** | **54.22 ns** | **28.36 ns** | **0.0145** |     **-** |     **-** |     **622 B** |
| **ApplyAndObserve** |    **64** |    **ParsedIntExisting** | **809.0 ns** | **52.43 ns** | **27.42 ns** | **0.0158** |     **-** |     **-** |     **629 B** |
| **ApplyAndObserve** |    **64** | **ParsedObjectExisting** | **763.8 ns** | **22.44 ns** | **11.74 ns** | **0.0147** |     **-** |     **-** |     **590 B** |
| **ApplyAndObserve** |    **64** |  **ParsedObjectMissing** | **887.7 ns** | **33.26 ns** | **17.40 ns** | **0.0175** |     **-** |     **-** |     **775 B** |
| **ApplyAndObserve** |    **64** | **Parse(...)ntrol [23]** | **752.7 ns** | **40.81 ns** | **21.34 ns** | **0.0075** |     **-** |     **-** |     **591 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [23]** | **703.1 ns** | **27.27 ns** | **14.26 ns** | **0.0138** |     **-** |     **-** |     **588 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [24]** | **774.1 ns** | **62.69 ns** | **32.79 ns** | **0.0146** |     **-** |     **-** |     **603 B** |
