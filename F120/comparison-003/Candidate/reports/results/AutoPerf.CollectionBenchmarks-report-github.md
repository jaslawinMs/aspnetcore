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
|         **Contains** |   **CopiedDefault5Miss** | **16.295 ns** | **0.8703 ns** | **0.4552 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedDefault5Miss | 10.999 ns | 0.1226 ns | 0.0641 ns |      - |     - |     - |         - |
|         **Contains** | **Unmod(...)5Miss [22]** | **39.400 ns** | **1.3911 ns** | **0.7276 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)5Miss [22] | 47.505 ns | 1.5350 ns | 0.8029 ns | 0.0005 |     - |     - |      32 B |
|         **Contains** |  **CopiedDefault5First** |  **7.477 ns** | **0.1579 ns** | **0.0826 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |  CopiedDefault5First |  2.335 ns | 0.1396 ns | 0.0730 ns |      - |     - |     - |         - |
|         **Contains** |   **CopiedDefault5Last** | **15.353 ns** | **0.2789 ns** | **0.1459 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedDefault5Last |  9.630 ns | 0.1276 ns | 0.0667 ns |      - |     - |     - |         - |
|         **Contains** |      **CopiedEmptyMiss** |  **5.774 ns** | **0.1018 ns** | **0.0532 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |      CopiedEmptyMiss |  6.935 ns | 0.2063 ns | 0.1079 ns |      - |     - |     - |         - |
|         **Contains** |        **CopiedOneMiss** |  **7.777 ns** | **0.2690 ns** | **0.1407 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |        CopiedOneMiss |  3.596 ns | 0.2039 ns | 0.1066 ns |      - |     - |     - |         - |
|         **Contains** |      **CopiedEightMiss** | **21.213 ns** | **0.6613 ns** | **0.3459 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |      CopiedEightMiss | 16.496 ns | 0.5360 ns | 0.2804 ns |      - |     - |     - |         - |
|         **Contains** | **Unmod(...)First [23]** | **18.214 ns** | **1.5514 ns** | **0.8114 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)First [23] | 20.231 ns | 1.4855 ns | 0.7770 ns | 0.0009 |     - |     - |      32 B |
