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
|           **CopyTo** |       **CopiedDefault5** | **33.274 ns** | **3.2744 ns** | **1.7126 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |       CopiedDefault5 | 12.609 ns | 3.8687 ns | 2.0234 ns |      - |     - |     - |         - |
|           **CopyTo** |   **UnmodifiedDefault5** | **50.530 ns** | **1.5392 ns** | **0.8050 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf |   UnmodifiedDefault5 | 50.292 ns | 1.9410 ns | 1.0152 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** | **Copie(...)fset2 [21]** | **31.703 ns** | **0.5281 ns** | **0.2762 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf | Copie(...)fset2 [21] | 10.908 ns | 0.2163 ns | 0.1131 ns |      - |     - |     - |         - |
|           **CopyTo** | **Unmod(...)fset2 [25]** | **50.203 ns** | **0.7574 ns** | **0.3961 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)fset2 [25] | 49.971 ns | 0.8736 ns | 0.4569 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** |          **CopiedEmpty** |  **5.398 ns** | **0.0799 ns** | **0.0418 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEmpty |  6.543 ns | 0.1612 ns | 0.0843 ns |      - |     - |     - |         - |
|           **CopyTo** |            **CopiedOne** |  **9.805 ns** | **0.2971 ns** | **0.1554 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |            CopiedOne |  3.744 ns | 0.2112 ns | 0.1104 ns |      - |     - |     - |         - |
|           **CopyTo** |          **CopiedEight** | **47.194 ns** | **1.3336 ns** | **0.6975 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEight | 16.996 ns | 0.4494 ns | 0.2351 ns |      - |     - |     - |         - |
|           **CopyTo** |   **CopiedEightOffset2** | **46.332 ns** | **1.0741 ns** | **0.5618 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedEightOffset2 | 16.994 ns | 1.7229 ns | 0.9011 ns |      - |     - |     - |         - |
