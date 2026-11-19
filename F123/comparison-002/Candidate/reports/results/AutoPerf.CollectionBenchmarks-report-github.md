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
|           **IndexOf** |       **CopiedDefault5** | **16.480 ns** | **0.2890 ns** | **0.1512 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |       CopiedDefault5 | 11.917 ns | 0.1154 ns | 0.0604 ns |      - |     - |     - |         - |
|           **IndexOf** |   **UnmodifiedDefault5** | **41.109 ns** | **0.3340 ns** | **0.1747 ns** | **0.0004** |     **-** |     **-** |      **32 B** |
| UnchangedContains |   UnmodifiedDefault5 | 50.513 ns | 0.4419 ns | 0.2311 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)First [22]** |  **7.055 ns** | **0.0530 ns** | **0.0277 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)First [22] |  2.182 ns | 0.0542 ns | 0.0283 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)First [26]** | **20.287 ns** | **0.9538 ns** | **0.4989 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)First [26] | 23.889 ns | 2.8804 ns | 1.5065 ns | 0.0007 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)tLast [21]** | **17.820 ns** | **2.8927 ns** | **1.5129 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)tLast [21] | 10.669 ns | 0.5930 ns | 0.3102 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)tLast [25]** | **42.886 ns** | **1.1650 ns** | **0.6093 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)tLast [25] | 47.108 ns | 0.9787 ns | 0.5119 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEmpty** |  **5.369 ns** | **0.0602 ns** | **0.0315 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEmpty |  6.196 ns | 0.1101 ns | 0.0576 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEmpty** |  **8.949 ns** | **0.1141 ns** | **0.0597 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |      UnmodifiedEmpty | 12.590 ns | 0.1882 ns | 0.0984 ns |      - |     - |     - |         - |
|           **IndexOf** |            **CopiedOne** |  **7.514 ns** | **0.2375 ns** | **0.1242 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |            CopiedOne |  3.716 ns | 0.1425 ns | 0.0745 ns |      - |     - |     - |         - |
|           **IndexOf** |        **UnmodifiedOne** | **21.176 ns** | **0.3164 ns** | **0.1655 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains |        UnmodifiedOne | 26.183 ns | 0.6131 ns | 0.3207 ns | 0.0008 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEight** | **22.815 ns** | **0.6925 ns** | **0.3622 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEight | 17.836 ns | 0.2284 ns | 0.1195 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEight** | **58.236 ns** | **1.0774 ns** | **0.5635 ns** | **0.0006** |     **-** |     **-** |      **32 B** |
| UnchangedContains |      UnmodifiedEight | 71.688 ns | 3.9357 ns | 2.0585 ns | 0.0007 |     - |     - |      32 B |
