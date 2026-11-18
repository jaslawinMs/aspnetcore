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
|         **Contains** |   **CopiedDefault5Miss** | **10.746 ns** | **0.2751 ns** | **0.1439 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedDefault5Miss | 11.867 ns | 0.3116 ns | 0.1630 ns |      - |     - |     - |         - |
|         **Contains** | **Unmod(...)5Miss [22]** | **49.094 ns** | **0.6331 ns** | **0.3311 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)5Miss [22] | 49.549 ns | 1.0373 ns | 0.5426 ns | 0.0005 |     - |     - |      32 B |
|         **Contains** |  **CopiedDefault5First** |  **2.533 ns** | **0.0401 ns** | **0.0210 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |  CopiedDefault5First |  2.552 ns | 0.0540 ns | 0.0283 ns |      - |     - |     - |         - |
|         **Contains** |   **CopiedDefault5Last** |  **9.203 ns** | **0.1997 ns** | **0.1045 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |   CopiedDefault5Last | 10.033 ns | 0.1883 ns | 0.0985 ns |      - |     - |     - |         - |
|         **Contains** |      **CopiedEmptyMiss** |  **6.634 ns** | **0.1661 ns** | **0.0869 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |      CopiedEmptyMiss |  6.484 ns | 0.1344 ns | 0.0703 ns |      - |     - |     - |         - |
|         **Contains** |        **CopiedOneMiss** |  **3.633 ns** | **0.0712 ns** | **0.0372 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |        CopiedOneMiss |  3.920 ns | 0.3730 ns | 0.1951 ns |      - |     - |     - |         - |
|         **Contains** |      **CopiedEightMiss** | **15.895 ns** | **0.2444 ns** | **0.1278 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedIndexOf |      CopiedEightMiss | 17.796 ns | 0.5333 ns | 0.2789 ns |      - |     - |     - |         - |
|         **Contains** | **Unmod(...)First [23]** | **18.613 ns** | **0.4954 ns** | **0.2591 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| UnchangedIndexOf | Unmod(...)First [23] | 19.612 ns | 0.8733 ns | 0.4567 ns | 0.0008 |     - |     - |      32 B |
