``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F121  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|           Method |              Profile |      Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |--------------------- |----------:|-----------:|-----------:|-------:|------:|------:|----------:|
|           **CopyTo** |       **CopiedDefault5** | **29.367 ns** |  **0.8027 ns** |  **0.4198 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |       CopiedDefault5 | 11.899 ns |  0.2221 ns |  0.1162 ns |      - |     - |     - |         - |
|           **CopyTo** |   **UnmodifiedDefault5** | **66.915 ns** |  **1.2861 ns** |  **0.6727 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf |   UnmodifiedDefault5 | 61.732 ns | 56.3116 ns | 29.4521 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** | **Copie(...)fset2 [21]** | **29.648 ns** |  **1.0050 ns** |  **0.5256 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf | Copie(...)fset2 [21] | 11.757 ns |  0.4259 ns |  0.2227 ns |      - |     - |     - |         - |
|           **CopyTo** | **Unmod(...)fset2 [25]** | **67.514 ns** |  **1.7333 ns** |  **0.9066 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)fset2 [25] | 51.841 ns |  1.7658 ns |  0.9235 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** |          **CopiedEmpty** |  **7.515 ns** |  **0.1089 ns** |  **0.0570 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEmpty |  6.548 ns |  0.0651 ns |  0.0341 ns |      - |     - |     - |         - |
|           **CopyTo** |            **CopiedOne** |  **7.727 ns** |  **0.1007 ns** |  **0.0527 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |            CopiedOne |  4.014 ns |  0.2123 ns |  0.1110 ns |      - |     - |     - |         - |
|           **CopyTo** |          **CopiedEight** | **42.065 ns** |  **0.9712 ns** |  **0.5080 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEight | 17.822 ns |  0.1797 ns |  0.0940 ns |      - |     - |     - |         - |
|           **CopyTo** |   **CopiedEightOffset2** | **41.607 ns** |  **1.2552 ns** |  **0.6565 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedEightOffset2 | 18.120 ns |  0.3186 ns |  0.1666 ns |      - |     - |     - |         - |
