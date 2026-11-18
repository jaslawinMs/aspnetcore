``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F120  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|           Method |              Profile |      Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |--------------------- |----------:|----------:|----------:|-------:|------:|------:|----------:|
|         **Contains** |   **CopiedDefault5Miss** | **11.942 ns** | **0.3596 ns** | **0.1881 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedDefault5Miss | 11.135 ns | 0.3482 ns | 0.1821 ns |      - |     - |     - |         - |
|         **Contains** | **Unmod(...)5Miss [22]** | **46.656 ns** | **1.3403 ns** | **0.7010 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)5Miss [22] | 50.443 ns | 0.9609 ns | 0.5026 ns | 0.0005 |     - |     - |      32 B |
|         **Contains** |  **CopiedDefault5First** |  **2.535 ns** | **0.0267 ns** | **0.0140 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |  CopiedDefault5First |  2.570 ns | 0.1389 ns | 0.0727 ns |      - |     - |     - |         - |
|         **Contains** |   **CopiedDefault5Last** | **10.316 ns** | **0.1929 ns** | **0.1009 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedDefault5Last |  9.871 ns | 0.7156 ns | 0.3743 ns |      - |     - |     - |         - |
|         **Contains** |      **CopiedEmptyMiss** |  **6.438 ns** | **0.2286 ns** | **0.1195 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |      CopiedEmptyMiss |  7.349 ns | 0.2000 ns | 0.1046 ns |      - |     - |     - |         - |
|         **Contains** |        **CopiedOneMiss** |  **4.158 ns** | **0.2224 ns** | **0.1163 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |        CopiedOneMiss |  4.101 ns | 0.1396 ns | 0.0730 ns |      - |     - |     - |         - |
|         **Contains** |      **CopiedEightMiss** | **18.133 ns** | **0.2335 ns** | **0.1221 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |      CopiedEightMiss | 16.677 ns | 1.0345 ns | 0.5411 ns |      - |     - |     - |         - |
|         **Contains** | **Unmod(...)First [23]** | **20.412 ns** | **1.6219 ns** | **0.8483 ns** | **0.0009** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)First [23] | 20.102 ns | 0.9778 ns | 0.5114 ns | 0.0007 |     - |     - |      32 B |
