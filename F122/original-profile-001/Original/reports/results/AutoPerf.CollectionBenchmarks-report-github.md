``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F122  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                  Method |            Profile |      Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------------ |------------------- |----------:|----------:|----------:|-------:|------:|------:|----------:|
|        **EnumerateGeneric** |     **CopiedDefault5** | **30.544 ns** | **2.0710 ns** | **1.0832 ns** | **0.0009** |     **-** |     **-** |      **40 B** |
|     EnumerateNonGeneric |     CopiedDefault5 | 30.027 ns | 0.7799 ns | 0.4079 ns | 0.0010 |     - |     - |      40 B |
| RetainGenericEnumerator |     CopiedDefault5 | 12.197 ns | 0.4516 ns | 0.2362 ns | 0.0009 |     - |     - |      40 B |
|        UnchangedIndexOf |     CopiedDefault5 | 10.653 ns | 0.2112 ns | 0.1105 ns |      - |     - |     - |         - |
|        **EnumerateGeneric** | **UnmodifiedDefault5** | **52.233 ns** | **5.4133 ns** | **2.8312 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
|     EnumerateNonGeneric | UnmodifiedDefault5 | 51.176 ns | 0.7192 ns | 0.3761 ns | 0.0005 |     - |     - |      32 B |
| RetainGenericEnumerator | UnmodifiedDefault5 | 14.429 ns | 2.0749 ns | 1.0852 ns | 0.0007 |     - |     - |      32 B |
|        UnchangedIndexOf | UnmodifiedDefault5 | 50.532 ns | 5.3907 ns | 2.8194 ns | 0.0005 |     - |     - |      32 B |
|        **EnumerateGeneric** |        **CopiedEmpty** |  **6.491 ns** | **0.0569 ns** | **0.0297 ns** |      **-** |     **-** |     **-** |         **-** |
|     EnumerateNonGeneric |        CopiedEmpty |  8.866 ns | 0.2764 ns | 0.1446 ns |      - |     - |     - |         - |
| RetainGenericEnumerator |        CopiedEmpty |  4.539 ns | 0.2029 ns | 0.1061 ns |      - |     - |     - |         - |
|        UnchangedIndexOf |        CopiedEmpty |  6.224 ns | 0.1441 ns | 0.0754 ns |      - |     - |     - |         - |
|        **EnumerateGeneric** |    **UnmodifiedEmpty** | **13.190 ns** | **0.5649 ns** | **0.2954 ns** |      **-** |     **-** |     **-** |         **-** |
|     EnumerateNonGeneric |    UnmodifiedEmpty | 15.227 ns | 0.4755 ns | 0.2487 ns |      - |     - |     - |         - |
| RetainGenericEnumerator |    UnmodifiedEmpty |  7.192 ns | 0.1674 ns | 0.0876 ns |      - |     - |     - |         - |
|        UnchangedIndexOf |    UnmodifiedEmpty | 12.790 ns | 0.5484 ns | 0.2868 ns |      - |     - |     - |         - |
|        **EnumerateGeneric** |          **CopiedOne** | **14.275 ns** | **0.6833 ns** | **0.3574 ns** | **0.0010** |     **-** |     **-** |      **40 B** |
|     EnumerateNonGeneric |          CopiedOne | 16.436 ns | 3.1989 ns | 1.6731 ns | 0.0010 |     - |     - |      40 B |
| RetainGenericEnumerator |          CopiedOne | 12.411 ns | 0.2891 ns | 0.1512 ns | 0.0010 |     - |     - |      40 B |
|        UnchangedIndexOf |          CopiedOne |  3.824 ns | 0.1396 ns | 0.0730 ns |      - |     - |     - |         - |
|        **EnumerateGeneric** |      **UnmodifiedOne** | **28.205 ns** | **1.9054 ns** | **0.9966 ns** | **0.0009** |     **-** |     **-** |      **32 B** |
|     EnumerateNonGeneric |      UnmodifiedOne | 29.398 ns | 1.1690 ns | 0.6114 ns | 0.0006 |     - |     - |      32 B |
| RetainGenericEnumerator |      UnmodifiedOne | 15.315 ns | 1.8507 ns | 0.9679 ns | 0.0008 |     - |     - |      32 B |
|        UnchangedIndexOf |      UnmodifiedOne | 26.081 ns | 1.7578 ns | 0.9193 ns | 0.0008 |     - |     - |      32 B |
|        **EnumerateGeneric** |        **CopiedEight** | **39.992 ns** | **1.7256 ns** | **0.9025 ns** | **0.0008** |     **-** |     **-** |      **40 B** |
|     EnumerateNonGeneric |        CopiedEight | 40.694 ns | 1.1108 ns | 0.5810 ns | 0.0009 |     - |     - |      40 B |
| RetainGenericEnumerator |        CopiedEight | 12.794 ns | 2.1621 ns | 1.1308 ns | 0.0009 |     - |     - |      40 B |
|        UnchangedIndexOf |        CopiedEight | 16.825 ns | 0.3373 ns | 0.1764 ns |      - |     - |     - |         - |
|        **EnumerateGeneric** |    **UnmodifiedEight** | **71.684 ns** | **1.6738 ns** | **0.8754 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
|     EnumerateNonGeneric |    UnmodifiedEight | 69.171 ns | 0.8667 ns | 0.4533 ns | 0.0007 |     - |     - |      32 B |
| RetainGenericEnumerator |    UnmodifiedEight | 14.248 ns | 0.3512 ns | 0.1837 ns | 0.0007 |     - |     - |      32 B |
|        UnchangedIndexOf |    UnmodifiedEight | 66.027 ns | 1.5313 ns | 0.8009 ns | 0.0007 |     - |     - |      32 B |
