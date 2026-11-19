``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F123  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|            Method |              Profile |      Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------------------- |----------:|----------:|----------:|-------:|------:|------:|----------:|
|           **IndexOf** |       **CopiedDefault5** | **10.703 ns** | **0.1460 ns** | **0.0764 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |       CopiedDefault5 | 11.897 ns | 0.0897 ns | 0.0469 ns |      - |     - |     - |         - |
|           **IndexOf** |   **UnmodifiedDefault5** | **50.897 ns** | **0.8658 ns** | **0.4528 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedContains |   UnmodifiedDefault5 | 51.461 ns | 1.8650 ns | 0.9754 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)First [22]** |  **2.575 ns** | **0.0172 ns** | **0.0090 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)First [22] |  2.178 ns | 0.0235 ns | 0.0123 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)First [26]** | **21.738 ns** | **0.9780 ns** | **0.5115 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)First [26] | 22.852 ns | 2.3781 ns | 1.2438 ns | 0.0007 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)tLast [21]** |  **9.554 ns** | **0.2173 ns** | **0.1137 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)tLast [21] | 10.319 ns | 0.1102 ns | 0.0576 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)tLast [25]** | **48.666 ns** | **2.0370 ns** | **1.0654 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)tLast [25] | 46.989 ns | 0.4390 ns | 0.2296 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEmpty** |  **6.607 ns** | **0.0935 ns** | **0.0489 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEmpty |  6.215 ns | 0.0919 ns | 0.0481 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEmpty** | **12.038 ns** | **0.1826 ns** | **0.0955 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |      UnmodifiedEmpty | 12.480 ns | 0.1470 ns | 0.0769 ns |      - |     - |     - |         - |
|           **IndexOf** |            **CopiedOne** |  **3.740 ns** | **0.2064 ns** | **0.1079 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |            CopiedOne |  3.765 ns | 0.2963 ns | 0.1550 ns |      - |     - |     - |         - |
|           **IndexOf** |        **UnmodifiedOne** | **27.647 ns** | **1.3282 ns** | **0.6947 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| UnchangedContains |        UnmodifiedOne | 26.670 ns | 2.4654 ns | 1.2895 ns | 0.0008 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEight** | **16.825 ns** | **0.3075 ns** | **0.1608 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEight | 17.881 ns | 0.3566 ns | 0.1865 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEight** | **72.832 ns** | **0.5482 ns** | **0.2867 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains |      UnmodifiedEight | 71.488 ns | 2.1737 ns | 1.1369 ns | 0.0007 |     - |     - |      32 B |
