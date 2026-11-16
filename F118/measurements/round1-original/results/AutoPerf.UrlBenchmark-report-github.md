``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
WarmupCount=3  

```
|           Method |                 Case |           Mean |          Error |         StdDev |   Gen 0 |  Gen 1 | Gen 2 |   Allocated |
|----------------- |--------------------- |---------------:|---------------:|---------------:|--------:|-------:|------:|------------:|
| **ProcessAttribute** |  **HtmlStringControl1K** |      **23.044 ns** |      **0.2945 ns** |      **0.1540 ns** |       **-** |      **-** |     **-** |           **-** |
| **ProcessAttribute** | **NonCo(...)ntrol [21]** |      **23.203 ns** |      **0.2156 ns** |      **0.1127 ns** |       **-** |      **-** |     **-** |           **-** |
| **ProcessAttribute** |       **NullTagControl** |       **7.247 ns** |      **0.0996 ns** |      **0.0521 ns** |       **-** |      **-** |     **-** |           **-** |
| **ProcessAttribute** |       **PageBuffered1K** |     **314.231 ns** |     **43.4167 ns** |     **22.7078 ns** |  **0.0562** |      **-** |     **-** |     **2,136 B** |
| **ProcessAttribute** |           **Parallel1K** | **651,829.453 ns** | **52,600.1390 ns** | **27,510.8898 ns** | **87.5000** |      **-** |     **-** | **3,373,093 B** |
| **ProcessAttribute** |         **ParallelFast** | **547,998.893 ns** | **17,426.8932 ns** |  **9,114.6021 ns** |       **-** |      **-** |     **-** |        **28 B** |
| **ProcessAttribute** |           **Prepared1K** |     **487.414 ns** |    **112.2198 ns** |     **58.6931 ns** |  **0.1166** |      **-** |     **-** |     **4,392 B** |
| **ProcessAttribute** |          **Prepared256** |     **205.527 ns** |     **14.2212 ns** |      **7.4380 ns** |  **0.0337** |      **-** |     **-** |     **1,320 B** |
| **ProcessAttribute** |           **Prepared2K** |     **997.093 ns** |    **129.2602 ns** |     **67.6056 ns** |  **0.2250** |      **-** |     **-** |     **8,488 B** |
| **ProcessAttribute** |           **Prepared4K** |   **1,901.078 ns** |    **256.1260 ns** |    **133.9588 ns** |  **0.4540** |      **-** |     **-** |    **16,680 B** |
| **ProcessAttribute** |           **Prepared8K** |   **3,170.719 ns** |    **330.2540 ns** |    **172.7292 ns** |  **0.9090** |      **-** |     **-** |    **33,064 B** |
| **ProcessAttribute** |    **PreparedEncoded1K** |   **5,590.514 ns** |    **603.1069 ns** |    **315.4366 ns** |  **0.4555** |      **-** |     **-** |    **16,864 B** |
| **ProcessAttribute** |       **PreparedOver4K** |   **2,199.271 ns** |    **485.8296 ns** |    **254.0983 ns** |  **0.4559** |      **-** |     **-** |    **16,688 B** |
| **ProcessAttribute** |        **PreparedShort** |     **127.916 ns** |      **6.4324 ns** |      **3.3643 ns** |  **0.0140** |      **-** |     **-** |       **552 B** |
| **ProcessAttribute** |     **PreparedTwoAttrs** |     **949.009 ns** |    **130.2531 ns** |     **68.1249 ns** |  **0.2292** |      **-** |     **-** |     **8,784 B** |
| **ProcessAttribute** |        **PreparedUrl1K** |   **1,146.989 ns** |    **131.0732 ns** |     **68.5538 ns** |  **0.2838** |      **-** |     **-** |    **10,640 B** |
| **ProcessAttribute** |        **PreparedUrl64** |     **252.002 ns** |     **26.6876 ns** |     **13.9581 ns** |  **0.0275** |      **-** |     **-** |     **1,040 B** |
| **ProcessAttribute** |             **Runner1K** |     **553.033 ns** |     **66.7256 ns** |     **34.8988 ns** |  **0.1175** |      **-** |     **-** |     **4,392 B** |
| **ProcessAttribute** |             **Runner8K** |   **3,433.230 ns** |    **636.4335 ns** |    **332.8670 ns** |  **0.9085** | **0.0313** |     **-** |    **33,064 B** |
| **ProcessAttribute** |          **RunnerShort** |     **202.348 ns** |     **18.8677 ns** |      **9.8682 ns** |  **0.0141** |      **-** |     **-** |       **552 B** |
| **ProcessAttribute** |       **RunnerTwoAttrs** |   **1,023.781 ns** |     **81.5198 ns** |     **42.6365 ns** |  **0.2382** |      **-** |     **-** |     **8,784 B** |
| **ProcessAttribute** |            **RunnerUrl** |     **394.798 ns** |     **30.6873 ns** |     **16.0500 ns** |  **0.0265** |      **-** |     **-** |     **1,040 B** |
| **ProcessAttribute** |      **StringControl1K** |      **22.066 ns** |      **0.5775 ns** |      **0.3020 ns** |       **-** |      **-** |     **-** |           **-** |
| **ProcessAttribute** |    **UnknownTagControl** |      **13.101 ns** |      **0.1423 ns** |      **0.0744 ns** |       **-** |      **-** |     **-** |           **-** |
