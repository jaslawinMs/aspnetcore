``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F042  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|          Method | Count |              Profile |     Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |------ |--------------------- |---------:|----------:|----------:|-------:|------:|------:|----------:|
| **ApplyAndObserve** |     **1** |    **ParsedIntExisting** | **810.9 ns** | **515.14 ns** | **269.43 ns** |      **-** |     **-** |     **-** |     **633 B** |
| **ApplyAndObserve** |     **1** | **ParsedObjectExisting** | **763.1 ns** |  **84.89 ns** |  **44.40 ns** | **0.0141** |     **-** |     **-** |     **589 B** |
| **ApplyAndObserve** |     **1** |  **ParsedObjectMissing** | **906.6 ns** |  **94.68 ns** |  **49.52 ns** | **0.0178** |     **-** |     **-** |     **775 B** |
| **ApplyAndObserve** |     **1** | **Parse(...)ntrol [23]** | **749.8 ns** |  **32.42 ns** |  **16.96 ns** | **0.0149** |     **-** |     **-** |     **591 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [23]** | **687.6 ns** |  **40.24 ns** |  **21.05 ns** | **0.0140** |     **-** |     **-** |     **589 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [24]** | **763.4 ns** |  **24.89 ns** |  **13.02 ns** | **0.0154** |     **-** |     **-** |     **604 B** |
| **ApplyAndObserve** |    **64** |    **ParsedIntExisting** | **738.8 ns** |  **27.37 ns** |  **14.32 ns** | **0.0085** |     **-** |     **-** |     **630 B** |
| **ApplyAndObserve** |    **64** | **ParsedObjectExisting** | **747.6 ns** |  **18.50 ns** |   **9.68 ns** | **0.0137** |     **-** |     **-** |     **588 B** |
| **ApplyAndObserve** |    **64** |  **ParsedObjectMissing** | **917.7 ns** |  **45.62 ns** |  **23.86 ns** | **0.0182** |     **-** |     **-** |     **776 B** |
| **ApplyAndObserve** |    **64** | **Parse(...)ntrol [23]** | **812.6 ns** |  **72.57 ns** |  **37.95 ns** | **0.0148** |     **-** |     **-** |     **591 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [23]** | **697.2 ns** |  **77.93 ns** |  **40.76 ns** | **0.0135** |     **-** |     **-** |     **588 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [24]** | **771.1 ns** |  **34.50 ns** |  **18.04 ns** | **0.0153** |     **-** |     **-** |     **604 B** |
