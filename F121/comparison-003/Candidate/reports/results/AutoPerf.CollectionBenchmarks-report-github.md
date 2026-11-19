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
|           **CopyTo** |       **CopiedDefault5** | **34.899 ns** | **0.7777 ns** | **0.4067 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |       CopiedDefault5 | 11.222 ns | 0.2351 ns | 0.1230 ns |      - |     - |     - |         - |
|           **CopyTo** |   **UnmodifiedDefault5** | **57.715 ns** | **1.0621 ns** | **0.5555 ns** | **0.0006** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf |   UnmodifiedDefault5 | 51.238 ns | 1.5781 ns | 0.8254 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** | **Copie(...)fset2 [21]** | **35.084 ns** | **1.0349 ns** | **0.5413 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf | Copie(...)fset2 [21] | 11.233 ns | 0.3544 ns | 0.1854 ns |      - |     - |     - |         - |
|           **CopyTo** | **Unmod(...)fset2 [25]** | **58.212 ns** | **2.7234 ns** | **1.4244 ns** | **0.0006** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)fset2 [25] | 50.791 ns | 0.5396 ns | 0.2822 ns | 0.0005 |     - |     - |      32 B |
|           **CopyTo** |          **CopiedEmpty** |  **5.445 ns** | **0.1434 ns** | **0.0750 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEmpty |  7.435 ns | 0.1496 ns | 0.0782 ns |      - |     - |     - |         - |
|           **CopyTo** |            **CopiedOne** |  **9.811 ns** | **0.2627 ns** | **0.1374 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |            CopiedOne |  4.001 ns | 0.2370 ns | 0.1240 ns |      - |     - |     - |         - |
|           **CopyTo** |          **CopiedEight** | **46.849 ns** | **0.9768 ns** | **0.5109 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |          CopiedEight | 16.852 ns | 0.2374 ns | 0.1242 ns |      - |     - |     - |         - |
|           **CopyTo** |   **CopiedEightOffset2** | **46.578 ns** | **1.1599 ns** | **0.6066 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedEightOffset2 | 16.450 ns | 0.2248 ns | 0.1176 ns |      - |     - |     - |         - |
