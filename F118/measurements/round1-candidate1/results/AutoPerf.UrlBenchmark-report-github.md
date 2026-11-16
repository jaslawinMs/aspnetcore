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
| **ProcessAttribute** |  **HtmlStringControl1K** |      **23.295 ns** |      **0.4711 ns** |      **0.2464 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** | **NonCo(...)ntrol [21]** |      **24.176 ns** |      **0.2671 ns** |      **0.1397 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |       **NullTagControl** |       **7.663 ns** |      **0.1657 ns** |      **0.0867 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |       **PageBuffered1K** |     **495.217 ns** |     **35.0831 ns** |     **18.3492 ns** |  **0.0573** |     **-** |     **-** |     **2,136 B** |
| **ProcessAttribute** |           **Parallel1K** | **632,461.562 ns** | **19,955.8102 ns** | **10,437.2746 ns** | **43.7500** |     **-** |     **-** | **1,689,635 B** |
| **ProcessAttribute** |         **ParallelFast** | **533,749.544 ns** | **29,264.2501 ns** | **15,305.7687 ns** |       **-** |     **-** |     **-** |        **26 B** |
| **ProcessAttribute** |           **Prepared1K** |     **447.601 ns** |     **31.6711 ns** |     **16.5646 ns** |  **0.0576** |     **-** |     **-** |     **2,200 B** |
| **ProcessAttribute** |          **Prepared256** |     **202.495 ns** |     **17.8972 ns** |      **9.3606 ns** |  **0.0173** |     **-** |     **-** |       **664 B** |
| **ProcessAttribute** |           **Prepared2K** |     **798.878 ns** |    **103.0478 ns** |     **53.8960 ns** |  **0.1109** |     **-** |     **-** |     **4,248 B** |
| **ProcessAttribute** |           **Prepared4K** |   **1,450.733 ns** |    **237.9327 ns** |    **124.4434 ns** |  **0.2205** |     **-** |     **-** |     **8,344 B** |
| **ProcessAttribute** |           **Prepared8K** |   **5,722.138 ns** |    **879.2351 ns** |    **459.8570 ns** |  **0.8810** |     **-** |     **-** |    **33,064 B** |
| **ProcessAttribute** |    **PreparedEncoded1K** |   **6,884.588 ns** |    **188.7255 ns** |     **98.7071 ns** |  **0.4709** |     **-** |     **-** |    **16,864 B** |
| **ProcessAttribute** |       **PreparedOver4K** |   **3,012.658 ns** |    **455.3738 ns** |    **238.1693 ns** |  **0.4439** |     **-** |     **-** |    **16,688 B** |
| **ProcessAttribute** |        **PreparedShort** |     **118.629 ns** |      **2.1387 ns** |      **1.1186 ns** |  **0.0074** |     **-** |     **-** |       **280 B** |
| **ProcessAttribute** |     **PreparedTwoAttrs** |     **879.546 ns** |     **87.6748 ns** |     **45.8556 ns** |  **0.1109** |     **-** |     **-** |     **4,400 B** |
| **ProcessAttribute** |        **PreparedUrl1K** |   **1,528.043 ns** |    **395.0495 ns** |    **206.6185 ns** |  **0.2183** |     **-** |     **-** |     **8,448 B** |
| **ProcessAttribute** |        **PreparedUrl64** |     **288.147 ns** |     **27.0141 ns** |     **14.1289 ns** |  **0.0196** |     **-** |     **-** |       **768 B** |
| **ProcessAttribute** |             **Runner1K** |     **544.944 ns** |     **72.1349 ns** |     **37.7279 ns** |  **0.0576** |     **-** |     **-** |     **2,200 B** |
| **ProcessAttribute** |             **Runner8K** |   **5,078.210 ns** |    **747.0552 ns** |    **390.7243 ns** |  **0.8791** |     **-** |     **-** |    **33,064 B** |
| **ProcessAttribute** |          **RunnerShort** |     **189.517 ns** |      **7.8148 ns** |      **4.0873 ns** |  **0.0058** |     **-** |     **-** |       **280 B** |
| **ProcessAttribute** |       **RunnerTwoAttrs** |     **981.629 ns** |    **138.4036 ns** |     **72.3878 ns** |  **0.1173** |     **-** |     **-** |     **4,400 B** |
| **ProcessAttribute** |            **RunnerUrl** |     **357.428 ns** |     **11.3899 ns** |      **5.9571 ns** |  **0.0177** |     **-** |     **-** |       **768 B** |
| **ProcessAttribute** |      **StringControl1K** |      **22.070 ns** |      **0.6638 ns** |      **0.3472 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |    **UnknownTagControl** |      **13.137 ns** |      **0.2305 ns** |      **0.1205 ns** |       **-** |     **-** |     **-** |           **-** |
