``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
WarmupCount=3  

```
|           Method |                 Case |           Mean |           Error |         StdDev |   Gen 0 |  Gen 1 | Gen 2 |   Allocated |
|----------------- |--------------------- |---------------:|----------------:|---------------:|--------:|-------:|------:|------------:|
| **ProcessAttribute** |  **HtmlStringControl1K** |      **23.539 ns** |       **0.4877 ns** |      **0.2551 ns** |       **-** |      **-** |     **-** |           **-** |
| **ProcessAttribute** | **NonCo(...)ntrol [21]** |      **23.408 ns** |       **0.2433 ns** |      **0.1273 ns** |       **-** |      **-** |     **-** |           **-** |
| **ProcessAttribute** |       **NullTagControl** |       **7.465 ns** |       **0.1211 ns** |      **0.0633 ns** |       **-** |      **-** |     **-** |           **-** |
| **ProcessAttribute** |       **PageBuffered1K** |     **468.642 ns** |      **86.5843 ns** |     **45.2853 ns** |  **0.0547** |      **-** |     **-** |     **2,136 B** |
| **ProcessAttribute** |           **Parallel1K** | **770,733.767 ns** | **112,534.0843 ns** | **58,857.5020 ns** | **90.2778** |      **-** |     **-** | **3,373,095 B** |
| **ProcessAttribute** |         **ParallelFast** | **538,587.044 ns** |  **30,443.1744 ns** | **15,922.3689 ns** |       **-** |      **-** |     **-** |        **17 B** |
| **ProcessAttribute** |           **Prepared1K** |     **794.097 ns** |      **87.2393 ns** |     **45.6278 ns** |  **0.1143** |      **-** |     **-** |     **4,392 B** |
| **ProcessAttribute** |          **Prepared256** |     **313.880 ns** |      **19.3460 ns** |     **10.1183 ns** |  **0.0339** |      **-** |     **-** |     **1,320 B** |
| **ProcessAttribute** |           **Prepared2K** |   **1,474.169 ns** |     **368.0750 ns** |    **192.5103 ns** |  **0.2212** |      **-** |     **-** |     **8,488 B** |
| **ProcessAttribute** |           **Prepared4K** |   **3,267.727 ns** |     **576.2887 ns** |    **301.4101 ns** |  **0.4639** |      **-** |     **-** |    **16,680 B** |
| **ProcessAttribute** |           **Prepared8K** |   **4,465.585 ns** |     **520.2704 ns** |    **272.1115 ns** |  **0.9064** |      **-** |     **-** |    **33,064 B** |
| **ProcessAttribute** |    **PreparedEncoded1K** |   **6,695.177 ns** |     **479.5000 ns** |    **250.7878 ns** |  **0.4600** |      **-** |     **-** |    **16,864 B** |
| **ProcessAttribute** |       **PreparedOver4K** |   **2,851.725 ns** |     **830.7226 ns** |    **434.4840 ns** |  **0.4426** |      **-** |     **-** |    **16,688 B** |
| **ProcessAttribute** |        **PreparedShort** |     **163.838 ns** |      **18.9645 ns** |      **9.9188 ns** |  **0.0135** |      **-** |     **-** |       **552 B** |
| **ProcessAttribute** |     **PreparedTwoAttrs** |   **1,531.463 ns** |     **179.9175 ns** |     **94.1003 ns** |  **0.2292** |      **-** |     **-** |     **8,784 B** |
| **ProcessAttribute** |        **PreparedUrl1K** |   **1,944.777 ns** |     **310.5583 ns** |    **162.4280 ns** |  **0.2849** |      **-** |     **-** |    **10,640 B** |
| **ProcessAttribute** |        **PreparedUrl64** |     **335.149 ns** |      **30.0101 ns** |     **15.6959 ns** |  **0.0271** |      **-** |     **-** |     **1,040 B** |
| **ProcessAttribute** |             **Runner1K** |     **895.338 ns** |     **124.8842 ns** |     **65.3169 ns** |  **0.1109** |      **-** |     **-** |     **4,392 B** |
| **ProcessAttribute** |             **Runner8K** |   **4,990.488 ns** |   **1,012.3280 ns** |    **529.4671 ns** |  **0.9009** | **0.0375** |     **-** |    **33,064 B** |
| **ProcessAttribute** |          **RunnerShort** |     **236.462 ns** |      **10.3983 ns** |      **5.4385 ns** |  **0.0142** |      **-** |     **-** |       **552 B** |
| **ProcessAttribute** |       **RunnerTwoAttrs** |   **1,745.036 ns** |     **198.2240 ns** |    **103.6750 ns** |  **0.2330** |      **-** |     **-** |     **8,784 B** |
| **ProcessAttribute** |            **RunnerUrl** |     **412.397 ns** |      **21.4288 ns** |     **11.2077 ns** |  **0.0244** |      **-** |     **-** |     **1,040 B** |
| **ProcessAttribute** |      **StringControl1K** |      **22.301 ns** |       **0.2626 ns** |      **0.1374 ns** |       **-** |      **-** |     **-** |           **-** |
| **ProcessAttribute** |    **UnknownTagControl** |      **13.151 ns** |       **0.1701 ns** |      **0.0890 ns** |       **-** |      **-** |     **-** |           **-** |
