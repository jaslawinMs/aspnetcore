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
| **ProcessAttribute** |  **HtmlStringControl1K** |      **23.617 ns** |      **0.8135 ns** |      **0.4255 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** | **NonCo(...)ntrol [21]** |      **23.553 ns** |      **0.5055 ns** |      **0.2644 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |       **NullTagControl** |       **7.240 ns** |      **0.0984 ns** |      **0.0515 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |       **PageBuffered1K** |     **472.791 ns** |     **59.9648 ns** |     **31.3627 ns** |  **0.0557** |     **-** |     **-** |     **2,136 B** |
| **ProcessAttribute** |           **Parallel1K** | **691,601.042 ns** | **72,970.4510 ns** | **38,164.9568 ns** | **90.2778** |     **-** |     **-** | **3,373,091 B** |
| **ProcessAttribute** |         **ParallelFast** | **557,285.440 ns** | **23,365.9403 ns** | **12,220.8386 ns** |       **-** |     **-** |     **-** |        **10 B** |
| **ProcessAttribute** |           **Prepared1K** |     **770.434 ns** |     **53.2282 ns** |     **27.8394 ns** |  **0.1172** |     **-** |     **-** |     **4,392 B** |
| **ProcessAttribute** |          **Prepared256** |     **296.716 ns** |     **19.5646 ns** |     **10.2327 ns** |  **0.0339** |     **-** |     **-** |     **1,320 B** |
| **ProcessAttribute** |           **Prepared2K** |   **1,678.250 ns** |    **395.8954 ns** |    **207.0610 ns** |  **0.2194** |     **-** |     **-** |     **8,488 B** |
| **ProcessAttribute** |           **Prepared4K** |   **3,353.252 ns** |    **435.0995 ns** |    **227.5655 ns** |  **0.4538** |     **-** |     **-** |    **16,680 B** |
| **ProcessAttribute** |           **Prepared8K** |   **5,437.482 ns** |  **1,691.5857 ns** |    **884.7320 ns** |  **0.8985** |     **-** |     **-** |    **33,064 B** |
| **ProcessAttribute** |    **PreparedEncoded1K** |   **6,979.179 ns** |    **476.7238 ns** |    **249.3358 ns** |  **0.4081** |     **-** |     **-** |    **16,864 B** |
| **ProcessAttribute** |       **PreparedOver4K** |   **3,396.096 ns** |    **774.7490 ns** |    **405.2087 ns** |  **0.4553** |     **-** |     **-** |    **16,688 B** |
| **ProcessAttribute** |        **PreparedShort** |     **168.704 ns** |      **4.6363 ns** |      **2.4249 ns** |  **0.0136** |     **-** |     **-** |       **552 B** |
| **ProcessAttribute** |     **PreparedTwoAttrs** |   **1,498.383 ns** |    **117.8798 ns** |     **61.6534 ns** |  **0.2240** |     **-** |     **-** |     **8,784 B** |
| **ProcessAttribute** |        **PreparedUrl1K** |   **2,061.948 ns** |    **649.5338 ns** |    **339.7187 ns** |  **0.2881** |     **-** |     **-** |    **10,640 B** |
| **ProcessAttribute** |        **PreparedUrl64** |     **378.482 ns** |    **120.4830 ns** |     **63.0149 ns** |  **0.0273** |     **-** |     **-** |     **1,040 B** |
| **ProcessAttribute** |             **Runner1K** |     **878.030 ns** |    **137.1371 ns** |     **71.7254 ns** |  **0.1142** |     **-** |     **-** |     **4,392 B** |
| **ProcessAttribute** |             **Runner8K** |   **5,722.826 ns** |  **1,278.0167 ns** |    **668.4274 ns** |  **0.8966** |     **-** |     **-** |    **33,064 B** |
| **ProcessAttribute** |          **RunnerShort** |     **238.838 ns** |     **24.8685 ns** |     **13.0067 ns** |  **0.0144** |     **-** |     **-** |       **552 B** |
| **ProcessAttribute** |       **RunnerTwoAttrs** |   **1,607.289 ns** |    **154.3033 ns** |     **80.7036 ns** |  **0.2317** |     **-** |     **-** |     **8,784 B** |
| **ProcessAttribute** |            **RunnerUrl** |     **424.540 ns** |     **42.8091 ns** |     **22.3900 ns** |  **0.0252** |     **-** |     **-** |     **1,040 B** |
| **ProcessAttribute** |      **StringControl1K** |      **21.971 ns** |      **0.1812 ns** |      **0.0947 ns** |       **-** |     **-** |     **-** |           **-** |
| **ProcessAttribute** |    **UnknownTagControl** |      **13.051 ns** |      **0.3433 ns** |      **0.1796 ns** |       **-** |     **-** |     **-** |           **-** |
