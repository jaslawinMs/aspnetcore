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
|         **Contains** |   **CopiedDefault5Miss** | **16.589 ns** | **0.2393 ns** | **0.1251 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedDefault5Miss | 10.663 ns | 0.1041 ns | 0.0545 ns |      - |     - |     - |         - |
|         **Contains** | **Unmod(...)5Miss [22]** | **37.881 ns** | **1.0339 ns** | **0.5408 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)5Miss [22] | 47.828 ns | 0.7005 ns | 0.3664 ns | 0.0005 |     - |     - |      32 B |
|         **Contains** |  **CopiedDefault5First** |  **7.684 ns** | **0.0449 ns** | **0.0235 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |  CopiedDefault5First |  2.540 ns | 0.0299 ns | 0.0156 ns |      - |     - |     - |         - |
|         **Contains** |   **CopiedDefault5Last** | **16.439 ns** | **0.2168 ns** | **0.1134 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedDefault5Last |  9.070 ns | 0.0960 ns | 0.0502 ns |      - |     - |     - |         - |
|         **Contains** |      **CopiedEmptyMiss** |  **5.681 ns** | **0.1005 ns** | **0.0526 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |      CopiedEmptyMiss |  6.588 ns | 0.1426 ns | 0.0746 ns |      - |     - |     - |         - |
|         **Contains** |        **CopiedOneMiss** |  **7.675 ns** | **0.0640 ns** | **0.0335 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |        CopiedOneMiss |  3.708 ns | 0.1713 ns | 0.0896 ns |      - |     - |     - |         - |
|         **Contains** |      **CopiedEightMiss** | **22.263 ns** | **0.3015 ns** | **0.1577 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |      CopiedEightMiss | 16.410 ns | 0.1882 ns | 0.0984 ns |      - |     - |     - |         - |
|         **Contains** | **Unmod(...)First [23]** | **17.359 ns** | **1.7946 ns** | **0.9386 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)First [23] | 18.670 ns | 1.0982 ns | 0.5744 ns | 0.0007 |     - |     - |      32 B |
