``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F121  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|           Method |              Profile |      Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |--------------------- |----------:|----------:|----------:|-------:|------:|------:|----------:|
|           **CopyTo** |       **CopiedDefault5** | **33.525 ns** | **2.1486 ns** | **1.1238 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |       CopiedDefault5 | 11.860 ns | 0.2084 ns | 0.1090 ns |      - |     - |     - |         - |
|           **CopyTo** |   **UnmodifiedDefault5** | **56.206 ns** | **5.7761 ns** | **3.0210 ns** | **0.0006** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf |   UnmodifiedDefault5 | 51.143 ns | 1.4929 ns | 0.7808 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** | **Copie(...)fset2 [21]** | **33.084 ns** | **0.6160 ns** | **0.3222 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf | Copie(...)fset2 [21] | 11.733 ns | 0.3467 ns | 0.1813 ns |      - |     - |     - |         - |
|           **CopyTo** | **Unmod(...)fset2 [25]** | **56.510 ns** | **4.7572 ns** | **2.4881 ns** | **0.0006** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)fset2 [25] | 51.054 ns | 0.9141 ns | 0.4781 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** |          **CopiedEmpty** |  **5.400 ns** | **0.0542 ns** | **0.0284 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEmpty |  6.626 ns | 0.1492 ns | 0.0780 ns |      - |     - |     - |         - |
|           **CopyTo** |            **CopiedOne** |  **9.882 ns** | **0.2880 ns** | **0.1507 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |            CopiedOne |  4.120 ns | 0.1624 ns | 0.0849 ns |      - |     - |     - |         - |
|           **CopyTo** |          **CopiedEight** | **47.063 ns** | **1.4149 ns** | **0.7400 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEight | 17.870 ns | 0.4760 ns | 0.2490 ns |      - |     - |     - |         - |
|           **CopyTo** |   **CopiedEightOffset2** | **46.518 ns** | **1.2427 ns** | **0.6500 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedEightOffset2 | 17.858 ns | 0.4805 ns | 0.2513 ns |      - |     - |     - |         - |
