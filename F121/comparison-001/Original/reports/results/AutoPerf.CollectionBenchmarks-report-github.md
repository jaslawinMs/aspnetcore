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
|           **CopyTo** |       **CopiedDefault5** | **28.676 ns** | **0.5816 ns** | **0.3042 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |       CopiedDefault5 | 11.237 ns | 0.7249 ns | 0.3792 ns |      - |     - |     - |         - |
|           **CopyTo** |   **UnmodifiedDefault5** | **65.581 ns** | **3.1620 ns** | **1.6538 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf |   UnmodifiedDefault5 | 48.607 ns | 0.8427 ns | 0.4408 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** | **Copie(...)fset2 [21]** | **28.774 ns** | **0.9612 ns** | **0.5027 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf | Copie(...)fset2 [21] | 18.177 ns | 0.4808 ns | 0.2515 ns |      - |     - |     - |         - |
|           **CopyTo** | **Unmod(...)fset2 [25]** | **68.037 ns** | **4.9918 ns** | **2.6108 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)fset2 [25] | 53.115 ns | 7.7410 ns | 4.0487 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** |          **CopiedEmpty** |  **7.755 ns** | **0.2719 ns** | **0.1422 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEmpty |  6.870 ns | 0.1201 ns | 0.0628 ns |      - |     - |     - |         - |
|           **CopyTo** |            **CopiedOne** |  **7.769 ns** | **0.1512 ns** | **0.0791 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |            CopiedOne |  3.566 ns | 0.1299 ns | 0.0679 ns |      - |     - |     - |         - |
|           **CopyTo** |          **CopiedEight** | **41.480 ns** | **1.0586 ns** | **0.5537 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEight | 16.781 ns | 0.2582 ns | 0.1351 ns |      - |     - |     - |         - |
|           **CopyTo** |   **CopiedEightOffset2** | **40.589 ns** | **1.8752 ns** | **0.9808 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedEightOffset2 | 16.695 ns | 1.1630 ns | 0.6083 ns |      - |     - |     - |         - |
