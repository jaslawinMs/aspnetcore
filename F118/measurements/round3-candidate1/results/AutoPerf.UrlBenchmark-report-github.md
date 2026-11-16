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
| **ProcessAttribute** |  **HtmlStringControl1K** |      **23.240 ns** |      **0.9375 ns** |      **0.4903 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** | **NonCo(...)ntrol [21]** |      **23.350 ns** |      **0.3989 ns** |      **0.2086 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |       **NullTagControl** |       **7.308 ns** |      **0.2062 ns** |      **0.1078 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |       **PageBuffered1K** |     **437.285 ns** |     **99.6707 ns** |     **52.1297 ns** |  **0.0562** |     **-** |     **-** |     **2,136 B** |
| **ProcessAttribute** |           **Parallel1K** | **651,667.969 ns** | **57,280.6896 ns** | **29,958.9082 ns** | **41.6667** |     **-** |     **-** | **1,689,605 B** |
| **ProcessAttribute** |         **ParallelFast** | **530,974.519 ns** | **21,955.6755 ns** | **11,483.2428 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |           **Prepared1K** |     **612.256 ns** |    **135.7500 ns** |     **70.9999 ns** |  **0.0594** |     **-** |     **-** |     **2,200 B** |
| **ProcessAttribute** |          **Prepared256** |     **199.786 ns** |     **43.8612 ns** |     **22.9403 ns** |  **0.0173** |     **-** |     **-** |       **664 B** |
| **ProcessAttribute** |           **Prepared2K** |     **877.941 ns** |    **213.1235 ns** |    **111.4677 ns** |  **0.1144** |     **-** |     **-** |     **4,248 B** |
| **ProcessAttribute** |           **Prepared4K** |   **2,001.087 ns** |    **793.9577 ns** |    **415.2552 ns** |  **0.2328** |     **-** |     **-** |     **8,344 B** |
| **ProcessAttribute** |           **Prepared8K** |   **5,780.744 ns** |  **2,229.1784 ns** |  **1,165.9034 ns** |  **0.8715** |     **-** |     **-** |    **33,064 B** |
| **ProcessAttribute** |    **PreparedEncoded1K** |   **6,519.863 ns** |    **655.1210 ns** |    **342.6410 ns** |  **0.4596** |     **-** |     **-** |    **16,864 B** |
| **ProcessAttribute** |       **PreparedOver4K** |   **2,525.852 ns** |    **353.7820 ns** |    **185.0348 ns** |  **0.4558** |     **-** |     **-** |    **16,688 B** |
| **ProcessAttribute** |        **PreparedShort** |     **138.666 ns** |      **9.6262 ns** |      **5.0347 ns** |  **0.0068** |     **-** |     **-** |       **280 B** |
| **ProcessAttribute** |     **PreparedTwoAttrs** |     **791.927 ns** |     **93.0882 ns** |     **48.6869 ns** |  **0.1148** |     **-** |     **-** |     **4,400 B** |
| **ProcessAttribute** |        **PreparedUrl1K** |   **1,611.358 ns** |    **919.8524 ns** |    **481.1006 ns** |  **0.2146** |     **-** |     **-** |     **8,448 B** |
| **ProcessAttribute** |        **PreparedUrl64** |     **316.640 ns** |     **68.8322 ns** |     **36.0006 ns** |  **0.0184** |     **-** |     **-** |       **768 B** |
| **ProcessAttribute** |             **Runner1K** |     **602.624 ns** |    **173.8742 ns** |     **90.9396 ns** |  **0.0586** |     **-** |     **-** |     **2,200 B** |
| **ProcessAttribute** |             **Runner8K** |   **7,604.977 ns** |    **753.0234 ns** |    **393.8458 ns** |  **0.8810** |     **-** |     **-** |    **33,064 B** |
| **ProcessAttribute** |          **RunnerShort** |     **208.212 ns** |      **5.4589 ns** |      **2.8551 ns** |  **0.0074** |     **-** |     **-** |       **280 B** |
| **ProcessAttribute** |       **RunnerTwoAttrs** |   **1,265.313 ns** |    **376.0114 ns** |    **196.6613 ns** |  **0.1112** |     **-** |     **-** |     **4,400 B** |
| **ProcessAttribute** |            **RunnerUrl** |     **439.745 ns** |     **20.9017 ns** |     **10.9320 ns** |  **0.0204** |     **-** |     **-** |       **768 B** |
| **ProcessAttribute** |      **StringControl1K** |      **21.956 ns** |      **0.3201 ns** |      **0.1674 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |    **UnknownTagControl** |      **13.089 ns** |      **0.1645 ns** |      **0.0861 ns** |       **-** |     **-** |     **-** |           **-** |
