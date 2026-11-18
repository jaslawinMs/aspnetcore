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
| **ApplyAndObserve** |     **1** |    **ParsedIntExisting** | **740.8 ns** | **47.59 ns** | **24.89 ns** | **0.0144** |     **-** |     **-** |     **636 B** |
| **ApplyAndObserve** |     **1** | **ParsedObjectExisting** | **710.0 ns** | **17.62 ns** |  **9.22 ns** | **0.0146** |     **-** |     **-** |     **590 B** |
| **ApplyAndObserve** |     **1** |  **ParsedObjectMissing** | **853.6 ns** | **33.76 ns** | **17.66 ns** | **0.0168** |     **-** |     **-** |     **774 B** |
| **ApplyAndObserve** |     **1** | **Parse(...)ntrol [23]** | **780.4 ns** | **63.88 ns** | **33.41 ns** | **0.0144** |     **-** |     **-** |     **590 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [23]** | **653.8 ns** | **50.65 ns** | **26.49 ns** | **0.0127** |     **-** |     **-** |     **585 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [24]** | **710.2 ns** | **82.11 ns** | **42.95 ns** | **0.0143** |     **-** |     **-** |     **622 B** |
| **ApplyAndObserve** |    **64** |    **ParsedIntExisting** | **802.8 ns** | **87.18 ns** | **45.59 ns** | **0.0156** |     **-** |     **-** |     **628 B** |
| **ApplyAndObserve** |    **64** | **ParsedObjectExisting** | **744.1 ns** | **47.33 ns** | **24.76 ns** | **0.0146** |     **-** |     **-** |     **590 B** |
| **ApplyAndObserve** |    **64** |  **ParsedObjectMissing** | **860.6 ns** | **58.44 ns** | **30.57 ns** | **0.0170** |     **-** |     **-** |     **774 B** |
| **ApplyAndObserve** |    **64** | **Parse(...)ntrol [23]** | **797.2 ns** | **80.46 ns** | **42.08 ns** | **0.0146** |     **-** |     **-** |     **590 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [23]** | **676.9 ns** | **29.04 ns** | **15.19 ns** | **0.0140** |     **-** |     **-** |     **589 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [24]** | **708.7 ns** | **45.24 ns** | **23.66 ns** | **0.0139** |     **-** |     **-** |     **620 B** |
