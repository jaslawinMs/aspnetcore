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
|           **IndexOf** |       **CopiedDefault5** | **16.752 ns** | **0.2435 ns** | **0.1274 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |       CopiedDefault5 | 11.285 ns | 0.1448 ns | 0.0757 ns |      - |     - |     - |         - |
|           **IndexOf** |   **UnmodifiedDefault5** | **40.064 ns** | **0.5035 ns** | **0.2633 ns** | **0.0004** |     **-** |     **-** |      **32 B** |
| UnchangedContains |   UnmodifiedDefault5 | 52.010 ns | 1.3962 ns | 0.7303 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)First [22]** |  **7.300 ns** | **0.1441 ns** | **0.0754 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)First [22] |  2.859 ns | 0.0286 ns | 0.0149 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)First [26]** | **21.389 ns** | **2.2890 ns** | **1.1972 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)First [26] | 22.352 ns | 2.2883 ns | 1.1968 ns | 0.0007 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)tLast [21]** | **16.310 ns** | **0.1325 ns** | **0.0693 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)tLast [21] |  9.740 ns | 0.2033 ns | 0.1063 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)tLast [25]** | **41.823 ns** | **1.8112 ns** | **0.9473 ns** | **0.0004** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)tLast [25] | 46.620 ns | 1.2909 ns | 0.6752 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEmpty** |  **5.701 ns** | **0.0691 ns** | **0.0362 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEmpty |  7.719 ns | 0.2067 ns | 0.1081 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEmpty** |  **9.443 ns** | **0.1650 ns** | **0.0863 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |      UnmodifiedEmpty | 13.392 ns | 0.3001 ns | 0.1570 ns |      - |     - |     - |         - |
|           **IndexOf** |            **CopiedOne** |  **8.448 ns** | **0.8431 ns** | **0.4410 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |            CopiedOne |  4.413 ns | 0.4929 ns | 0.2578 ns |      - |     - |     - |         - |
|           **IndexOf** |        **UnmodifiedOne** | **22.195 ns** | **1.5971 ns** | **0.8353 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains |        UnmodifiedOne | 27.690 ns | 1.7760 ns | 0.9289 ns | 0.0009 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEight** | **22.729 ns** | **0.4052 ns** | **0.2119 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEight | 16.603 ns | 0.5225 ns | 0.2733 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEight** | **56.638 ns** | **2.4281 ns** | **1.2699 ns** | **0.0006** |     **-** |     **-** |      **32 B** |
| UnchangedContains |      UnmodifiedEight | 69.402 ns | 0.7897 ns | 0.4130 ns | 0.0007 |     - |     - |      32 B |
