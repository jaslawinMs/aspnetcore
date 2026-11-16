``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
WarmupCount=3  

```
|           Method |                 Case |           Mean |          Error |         StdDev |   Gen 0 | Gen 1 | Gen 2 |   Allocated |
|----------------- |--------------------- |---------------:|---------------:|---------------:|--------:|------:|------:|------------:|
| **ProcessAttribute** |  **HtmlStringControl1K** |      **23.214 ns** |      **0.7000 ns** |      **0.3661 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** | **NonCo(...)ntrol [21]** |      **23.504 ns** |      **0.5143 ns** |      **0.2690 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |       **NullTagControl** |       **7.294 ns** |      **0.2084 ns** |      **0.1090 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |       **PageBuffered1K** |     **511.383 ns** |    **143.5978 ns** |     **75.1044 ns** |  **0.0557** |     **-** |     **-** |     **2,136 B** |
| **ProcessAttribute** |           **Parallel1K** | **663,231.597 ns** | **55,002.2653 ns** | **28,767.2483 ns** | **41.6667** |     **-** |     **-** | **1,689,637 B** |
| **ProcessAttribute** |         **ParallelFast** | **533,287.760 ns** | **28,579.8655 ns** | **14,947.8223 ns** |       **-** |     **-** |     **-** |        **18 B** |
| **ProcessAttribute** |           **Prepared1K** |     **438.322 ns** |     **39.1929 ns** |     **20.4986 ns** |  **0.0585** |     **-** |     **-** |     **2,200 B** |
| **ProcessAttribute** |          **Prepared256** |     **203.501 ns** |     **28.9970 ns** |     **15.1660 ns** |  **0.0178** |     **-** |     **-** |       **664 B** |
| **ProcessAttribute** |           **Prepared2K** |     **871.149 ns** |    **145.4501 ns** |     **76.0732 ns** |  **0.1130** |     **-** |     **-** |     **4,248 B** |
| **ProcessAttribute** |           **Prepared4K** |   **1,681.345 ns** |    **227.6255 ns** |    **119.0525 ns** |  **0.2264** |     **-** |     **-** |     **8,344 B** |
| **ProcessAttribute** |           **Prepared8K** |   **5,188.599 ns** |    **870.2515 ns** |    **455.1584 ns** |  **0.8834** |     **-** |     **-** |    **33,064 B** |
| **ProcessAttribute** |    **PreparedEncoded1K** |   **7,087.889 ns** |    **515.3300 ns** |    **269.5275 ns** |  **0.4694** |     **-** |     **-** |    **16,864 B** |
| **ProcessAttribute** |       **PreparedOver4K** |   **3,799.329 ns** |    **872.2992 ns** |    **456.2294 ns** |  **0.4487** |     **-** |     **-** |    **16,688 B** |
| **ProcessAttribute** |        **PreparedShort** |     **121.267 ns** |      **7.5478 ns** |      **3.9477 ns** |  **0.0074** |     **-** |     **-** |       **280 B** |
| **ProcessAttribute** |     **PreparedTwoAttrs** |     **898.716 ns** |     **70.7012 ns** |     **36.9781 ns** |  **0.1178** |     **-** |     **-** |     **4,400 B** |
| **ProcessAttribute** |        **PreparedUrl1K** |   **1,464.548 ns** |    **253.8332 ns** |    **132.7597 ns** |  **0.2141** |     **-** |     **-** |     **8,448 B** |
| **ProcessAttribute** |        **PreparedUrl64** |     **277.955 ns** |     **20.5949 ns** |     **10.7715 ns** |  **0.0191** |     **-** |     **-** |       **768 B** |
| **ProcessAttribute** |             **Runner1K** |     **528.278 ns** |     **58.3936 ns** |     **30.5410 ns** |  **0.0576** |     **-** |     **-** |     **2,200 B** |
| **ProcessAttribute** |             **Runner8K** |   **5,202.939 ns** |    **849.2678 ns** |    **444.1835 ns** |  **0.8634** |     **-** |     **-** |    **33,064 B** |
| **ProcessAttribute** |          **RunnerShort** |     **186.247 ns** |      **8.4465 ns** |      **4.4177 ns** |  **0.0057** |     **-** |     **-** |       **280 B** |
| **ProcessAttribute** |       **RunnerTwoAttrs** |     **948.543 ns** |     **43.2059 ns** |     **22.5975 ns** |  **0.1139** |     **-** |     **-** |     **4,400 B** |
| **ProcessAttribute** |            **RunnerUrl** |     **355.596 ns** |     **28.1021 ns** |     **14.6979 ns** |  **0.0175** |     **-** |     **-** |       **768 B** |
| **ProcessAttribute** |      **StringControl1K** |      **21.802 ns** |      **0.3331 ns** |      **0.1742 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |    **UnknownTagControl** |      **13.035 ns** |      **0.1896 ns** |      **0.0992 ns** |       **-** |     **-** |     **-** |           **-** |
