``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F042  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|          Method | Count |              Profile |     Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |------ |--------------------- |---------:|----------:|---------:|-------:|------:|------:|----------:|
| **ApplyAndObserve** |     **1** |    **ParsedIntExisting** | **791.3 ns** |  **65.70 ns** | **34.36 ns** | **0.0149** |     **-** |     **-** |     **637 B** |
| **ApplyAndObserve** |     **1** | **ParsedObjectExisting** | **775.1 ns** | **104.45 ns** | **54.63 ns** | **0.0140** |     **-** |     **-** |     **589 B** |
| **ApplyAndObserve** |     **1** |  **ParsedObjectMissing** | **898.9 ns** |  **31.98 ns** | **16.73 ns** | **0.0180** |     **-** |     **-** |     **776 B** |
| **ApplyAndObserve** |     **1** | **Parse(...)ntrol [23]** | **798.5 ns** |  **22.33 ns** | **11.68 ns** | **0.0147** |     **-** |     **-** |     **591 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [23]** | **689.0 ns** |  **13.01 ns** |  **6.81 ns** | **0.0143** |     **-** |     **-** |     **590 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [24]** | **738.1 ns** |  **21.28 ns** | **11.13 ns** | **0.0146** |     **-** |     **-** |     **603 B** |
| **ApplyAndObserve** |    **64** |    **ParsedIntExisting** | **802.4 ns** |  **23.34 ns** | **12.21 ns** | **0.0160** |     **-** |     **-** |     **629 B** |
| **ApplyAndObserve** |    **64** | **ParsedObjectExisting** | **765.3 ns** |  **42.65 ns** | **22.30 ns** | **0.0140** |     **-** |     **-** |     **589 B** |
| **ApplyAndObserve** |    **64** |  **ParsedObjectMissing** | **903.9 ns** |  **31.48 ns** | **16.46 ns** | **0.0180** |     **-** |     **-** |     **776 B** |
| **ApplyAndObserve** |    **64** | **Parse(...)ntrol [23]** | **807.0 ns** |  **77.04 ns** | **40.30 ns** | **0.0147** |     **-** |     **-** |     **591 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [23]** | **692.7 ns** |  **29.70 ns** | **15.53 ns** | **0.0142** |     **-** |     **-** |     **589 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [24]** | **772.1 ns** |  **68.55 ns** | **35.85 ns** | **0.0149** |     **-** |     **-** |     **623 B** |
