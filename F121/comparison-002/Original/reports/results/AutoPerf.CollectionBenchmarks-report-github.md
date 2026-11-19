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
|           **CopyTo** |       **CopiedDefault5** | **31.911 ns** | **0.6784 ns** | **0.3548 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |       CopiedDefault5 | 11.185 ns | 0.2444 ns | 0.1278 ns |      - |     - |     - |         - |
|           **CopyTo** |   **UnmodifiedDefault5** | **69.757 ns** | **1.4708 ns** | **0.7692 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf |   UnmodifiedDefault5 | 48.116 ns | 1.7417 ns | 0.9109 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** | **Copie(...)fset2 [21]** | **31.791 ns** | **1.0066 ns** | **0.5265 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf | Copie(...)fset2 [21] | 11.271 ns | 0.4420 ns | 0.2312 ns |      - |     - |     - |         - |
|           **CopyTo** | **Unmod(...)fset2 [25]** | **69.706 ns** | **1.0955 ns** | **0.5730 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)fset2 [25] | 48.754 ns | 2.2145 ns | 1.1582 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** |          **CopiedEmpty** |  **7.217 ns** | **0.0389 ns** | **0.0204 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEmpty |  7.203 ns | 0.0620 ns | 0.0324 ns |      - |     - |     - |         - |
|           **CopyTo** |            **CopiedOne** |  **7.743 ns** | **0.2281 ns** | **0.1193 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |            CopiedOne |  3.912 ns | 0.1026 ns | 0.0537 ns |      - |     - |     - |         - |
|           **CopyTo** |          **CopiedEight** | **41.840 ns** | **0.9123 ns** | **0.4771 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEight | 16.890 ns | 0.1850 ns | 0.0968 ns |      - |     - |     - |         - |
|           **CopyTo** |   **CopiedEightOffset2** | **41.490 ns** | **1.0861 ns** | **0.5680 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedEightOffset2 | 16.545 ns | 0.3021 ns | 0.1580 ns |      - |     - |     - |         - |
