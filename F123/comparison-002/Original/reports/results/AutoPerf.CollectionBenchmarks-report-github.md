``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F123  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|            Method |              Profile |      Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------------------- |----------:|-----------:|-----------:|-------:|------:|------:|----------:|
|           **IndexOf** |       **CopiedDefault5** | **10.725 ns** |  **0.1251 ns** |  **0.0655 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |       CopiedDefault5 | 11.193 ns |  0.7762 ns |  0.4060 ns |      - |     - |     - |         - |
|           **IndexOf** |   **UnmodifiedDefault5** | **52.697 ns** |  **2.6645 ns** |  **1.3936 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedContains |   UnmodifiedDefault5 | 65.025 ns | 29.1361 ns | 15.2387 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)First [22]** |  **2.617 ns** |  **0.0750 ns** |  **0.0392 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)First [22] |  2.877 ns |  0.1427 ns |  0.0746 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)First [26]** | **23.251 ns** |  **2.5641 ns** |  **1.3411 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)First [26] | 21.881 ns |  2.2753 ns |  1.1900 ns | 0.0008 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)tLast [21]** |  **9.801 ns** |  **0.2384 ns** |  **0.1247 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)tLast [21] | 10.510 ns |  0.4462 ns |  0.2334 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)tLast [25]** | **49.247 ns** |  **2.4807 ns** |  **1.2974 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)tLast [25] | 47.616 ns |  2.5963 ns |  1.3579 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEmpty** |  **6.906 ns** |  **0.1047 ns** |  **0.0548 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEmpty |  7.575 ns |  0.1895 ns |  0.0991 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEmpty** | **13.085 ns** |  **0.1882 ns** |  **0.0984 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |      UnmodifiedEmpty | 13.193 ns |  0.1296 ns |  0.0678 ns |      - |     - |     - |         - |
|           **IndexOf** |            **CopiedOne** |  **3.810 ns** |  **0.0932 ns** |  **0.0487 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |            CopiedOne |  4.368 ns |  0.4931 ns |  0.2579 ns |      - |     - |     - |         - |
|           **IndexOf** |        **UnmodifiedOne** | **26.722 ns** |  **0.3710 ns** |  **0.1941 ns** | **0.0009** |     **-** |     **-** |      **32 B** |
| UnchangedContains |        UnmodifiedOne | 26.279 ns |  0.3139 ns |  0.1642 ns | 0.0008 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEight** | **16.874 ns** |  **0.2948 ns** |  **0.1542 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEight | 16.295 ns |  0.2826 ns |  0.1478 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEight** | **71.770 ns** |  **1.8624 ns** |  **0.9741 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains |      UnmodifiedEight | 70.674 ns |  1.0725 ns |  0.5609 ns | 0.0007 |     - |     - |      32 B |
