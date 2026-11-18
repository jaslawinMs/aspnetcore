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
| **ApplyAndObserve** |     **1** |    **ParsedIntExisting** | **961.8 ns** | **614.64 ns** | **321.47 ns** |      **-** |     **-** |     **-** |     **633 B** |
| **ApplyAndObserve** |     **1** | **ParsedObjectExisting** | **765.5 ns** |  **42.32 ns** |  **22.13 ns** | **0.0143** |     **-** |     **-** |     **590 B** |
| **ApplyAndObserve** |     **1** |  **ParsedObjectMissing** | **918.3 ns** |  **50.97 ns** |  **26.66 ns** | **0.0179** |     **-** |     **-** |     **776 B** |
| **ApplyAndObserve** |     **1** | **Parse(...)ntrol [23]** | **750.4 ns** |  **31.50 ns** |  **16.47 ns** | **0.0078** |     **-** |     **-** |     **572 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [23]** | **695.6 ns** |  **40.10 ns** |  **20.97 ns** | **0.0138** |     **-** |     **-** |     **588 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [24]** | **739.3 ns** | **102.18 ns** |  **53.44 ns** | **0.0081** |     **-** |     **-** |     **605 B** |
| **ApplyAndObserve** |    **64** |    **ParsedIntExisting** | **795.8 ns** |  **41.54 ns** |  **21.73 ns** | **0.0153** |     **-** |     **-** |     **628 B** |
| **ApplyAndObserve** |    **64** | **ParsedObjectExisting** | **754.2 ns** |  **39.28 ns** |  **20.55 ns** | **0.0138** |     **-** |     **-** |     **588 B** |
| **ApplyAndObserve** |    **64** |  **ParsedObjectMissing** | **918.4 ns** | **104.51 ns** |  **54.66 ns** | **0.0179** |     **-** |     **-** |     **776 B** |
| **ApplyAndObserve** |    **64** | **Parse(...)ntrol [23]** | **765.8 ns** |  **31.96 ns** |  **16.72 ns** | **0.0075** |     **-** |     **-** |     **592 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [23]** | **692.7 ns** |  **46.23 ns** |  **24.18 ns** | **0.0137** |     **-** |     **-** |     **588 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [24]** | **761.0 ns** |  **28.49 ns** |  **14.90 ns** | **0.0141** |     **-** |     **-** |     **621 B** |
