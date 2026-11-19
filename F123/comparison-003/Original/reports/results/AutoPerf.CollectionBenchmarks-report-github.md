``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F123  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|            Method |              Profile |      Mean |       Error |      StdDev |    Median |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------------------- |----------:|------------:|------------:|----------:|-------:|------:|------:|----------:|
|           **IndexOf** |       **CopiedDefault5** | **90.394 ns** | **280.6661 ns** | **146.7938 ns** | **11.014 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |       CopiedDefault5 | 11.596 ns |   0.2163 ns |   0.1131 ns | 11.596 ns |      - |     - |     - |         - |
|           **IndexOf** |   **UnmodifiedDefault5** | **48.700 ns** |   **2.3280 ns** |   **1.2176 ns** | **48.227 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedContains |   UnmodifiedDefault5 | 49.945 ns |   0.7808 ns |   0.4084 ns | 49.866 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)First [22]** |  **2.333 ns** |   **0.0516 ns** |   **0.0270 ns** |  **2.328 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)First [22] |  2.246 ns |   0.0260 ns |   0.0136 ns |  2.245 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)First [26]** | **22.058 ns** |   **2.5834 ns** |   **1.3512 ns** | **21.669 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)First [26] | 23.074 ns |   1.7072 ns |   0.8929 ns | 22.722 ns | 0.0007 |     - |     - |      32 B |
|           **IndexOf** | **Copie(...)tLast [21]** |  **9.548 ns** |   **0.0982 ns** |   **0.0514 ns** |  **9.522 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains | Copie(...)tLast [21] |  9.624 ns |   0.0739 ns |   0.0387 ns |  9.619 ns |      - |     - |     - |         - |
|           **IndexOf** | **Unmod(...)tLast [25]** | **45.462 ns** |   **0.8506 ns** |   **0.4449 ns** | **45.410 ns** | **0.0005** |     **-** |     **-** |      **32 B** |
| UnchangedContains | Unmod(...)tLast [25] | 47.981 ns |   2.0050 ns |   1.0486 ns | 47.712 ns | 0.0005 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEmpty** |  **6.688 ns** |   **0.0390 ns** |   **0.0204 ns** |  **6.687 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEmpty |  6.451 ns |   0.0949 ns |   0.0496 ns |  6.447 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEmpty** | **12.140 ns** |   **0.1028 ns** |   **0.0538 ns** | **12.149 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |      UnmodifiedEmpty | 12.259 ns |   0.2236 ns |   0.1169 ns | 12.210 ns |      - |     - |     - |         - |
|           **IndexOf** |            **CopiedOne** |  **3.898 ns** |   **0.0803 ns** |   **0.0420 ns** |  **3.885 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |            CopiedOne |  3.910 ns |   0.1137 ns |   0.0594 ns |  3.911 ns |      - |     - |     - |         - |
|           **IndexOf** |        **UnmodifiedOne** | **25.225 ns** |   **0.2979 ns** |   **0.1558 ns** | **25.241 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| UnchangedContains |        UnmodifiedOne | 25.869 ns |   1.2308 ns |   0.6437 ns | 25.684 ns | 0.0008 |     - |     - |      32 B |
|           **IndexOf** |          **CopiedEight** | **16.697 ns** |   **0.1456 ns** |   **0.0762 ns** | **16.701 ns** |      **-** |     **-** |     **-** |         **-** |
| UnchangedContains |          CopiedEight | 15.819 ns |   0.3313 ns |   0.1733 ns | 15.866 ns |      - |     - |     - |         - |
|           **IndexOf** |      **UnmodifiedEight** | **67.556 ns** |   **1.7174 ns** |   **0.8982 ns** | **67.931 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| UnchangedContains |      UnmodifiedEight | 69.029 ns |   1.1759 ns |   0.6150 ns | 68.941 ns | 0.0007 |     - |     - |      32 B |
