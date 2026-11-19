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
|           **IndexOf** |       **CopiedDefault5** | **16.971 ns** | **0.2847 ns** | **0.1489 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |       CopiedDefault5 | 11.570 ns | 0.2482 ns | 0.1298 ns |      - |     - |     - |         - |
|           **IndexOf** |   **UnmodifiedDefault5** | **42.234 ns** | **1.3302 ns** | **0.6957 ns** | **0.0004** |     **-** |     **-** |      **32 B** |
| UnchangedContains |   UnmodifiedDefault5 | 49.797 ns | 4.0746 ns | 2.1311 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)First [22]** |  **6.694 ns** | **0.0474 ns** | **0.0248 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)First [22] |  2.238 ns | 0.0317 ns | 0.0166 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)First [26]** | **20.354 ns** | **2.0478 ns** | **1.0711 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)First [26] | 23.544 ns | 2.3340 ns | 1.2207 ns | 0.0008 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)tLast [21]** | **15.585 ns** | **0.3411 ns** | **0.1784 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)tLast [21] |  9.627 ns | 0.1646 ns | 0.0861 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)tLast [25]** | **41.637 ns** | **0.8828 ns** | **0.4617 ns** | **0.0009** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)tLast [25] | 47.946 ns | 6.3521 ns | 3.3223 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEmpty** |  **5.405 ns** | **0.0169 ns** | **0.0088 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEmpty |  6.799 ns | 0.0681 ns | 0.0356 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEmpty** |  **8.935 ns** | **0.0870 ns** | **0.0455 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |      UnmodifiedEmpty | 12.947 ns | 0.1125 ns | 0.0588 ns |      - |     - |     - |         - |
|           **IndexOf** |            **CopiedOne** |  **7.563 ns** | **0.1887 ns** | **0.0987 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |            CopiedOne |  3.823 ns | 0.1755 ns | 0.0918 ns |      - |     - |     - |         - |
|           **IndexOf** |        **UnmodifiedOne** | **21.049 ns** | **0.5052 ns** | **0.2642 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains |        UnmodifiedOne | 26.628 ns | 1.7081 ns | 0.8934 ns | 0.0008 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEight** | **23.728 ns** | **2.4908 ns** | **1.3027 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEight | 16.718 ns | 1.0895 ns | 0.5698 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEight** | **61.569 ns** | **7.8274 ns** | **4.0939 ns** | **0.0006** |     **-** |     **-** |      **32 B** |
| UnchangedContains |      UnmodifiedEight | 70.213 ns | 3.7935 ns | 1.9841 ns | 0.0007 |     - |     - |      32 B |
