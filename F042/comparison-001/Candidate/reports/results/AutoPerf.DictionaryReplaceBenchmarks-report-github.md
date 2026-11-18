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
| **ApplyAndObserve** |     **1** |    **ParsedIntExisting** | **802.3 ns** | **82.59 ns** | **43.20 ns** |      **-** |     **-** |     **-** |     **629 B** |
| **ApplyAndObserve** |     **1** | **ParsedObjectExisting** | **735.9 ns** | **28.50 ns** | **14.91 ns** | **0.0136** |     **-** |     **-** |     **588 B** |
| **ApplyAndObserve** |     **1** |  **ParsedObjectMissing** | **862.3 ns** | **70.14 ns** | **36.69 ns** | **0.0169** |     **-** |     **-** |     **774 B** |
| **ApplyAndObserve** |     **1** | **Parse(...)ntrol [23]** | **779.6 ns** | **71.38 ns** | **37.33 ns** | **0.0141** |     **-** |     **-** |     **589 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [23]** | **647.0 ns** | **63.86 ns** | **33.40 ns** | **0.0125** |     **-** |     **-** |     **585 B** |
| **ApplyAndObserve** |     **1** | **Progr(...)sting [24]** | **737.8 ns** | **49.30 ns** | **25.79 ns** | **0.0142** |     **-** |     **-** |     **621 B** |
| **ApplyAndObserve** |    **64** |    **ParsedIntExisting** | **794.1 ns** | **75.85 ns** | **39.67 ns** | **0.0161** |     **-** |     **-** |     **629 B** |
| **ApplyAndObserve** |    **64** | **ParsedObjectExisting** | **721.1 ns** | **61.68 ns** | **32.26 ns** | **0.0135** |     **-** |     **-** |     **587 B** |
| **ApplyAndObserve** |    **64** |  **ParsedObjectMissing** | **868.6 ns** | **27.67 ns** | **14.47 ns** | **0.0175** |     **-** |     **-** |     **775 B** |
| **ApplyAndObserve** |    **64** | **Parse(...)ntrol [23]** | **782.3 ns** | **38.41 ns** | **20.09 ns** | **0.0144** |     **-** |     **-** |     **590 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [23]** | **666.7 ns** | **35.46 ns** | **18.55 ns** | **0.0132** |     **-** |     **-** |     **587 B** |
| **ApplyAndObserve** |    **64** | **Progr(...)sting [24]** | **773.9 ns** | **35.15 ns** | **18.38 ns** | **0.0146** |     **-** |     **-** |     **622 B** |
