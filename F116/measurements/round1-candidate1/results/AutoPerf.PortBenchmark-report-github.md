``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
WarmupCount=3  

```
|     Method |          Case |           Mean |          Error |         StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------- |-------------- |---------------:|---------------:|---------------:|-------:|------:|------:|----------:|
| **ReadOrEmit** |      **GetFirst** |       **6.870 ns** |      **1.1098 ns** |      **0.5804 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |       **GetMix2** |      **14.845 ns** |      **0.3351 ns** |      **0.1753 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |       **GetMix4** |      **44.638 ns** |      **3.3951 ns** |      **1.7757 ns** | **0.0009** |     **-** |     **-** |      **48 B** |
| **ReadOrEmit** |     **GetSecond** |       **7.891 ns** |      **0.1835 ns** |      **0.0959 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **GetThird** |      **13.955 ns** |      **1.0156 ns** |      **0.5312 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **ReadOrEmit** |     **ListFirst** |      **46.326 ns** |      **0.7659 ns** |      **0.4006 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **ListMix2** |      **97.617 ns** |      **7.2373 ns** |      **3.7853 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |    **ListSecond** |      **48.820 ns** |      **1.6590 ns** |      **0.8677 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **ListThird** |      **55.099 ns** |      **1.3233 ns** |      **0.6921 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **ReadOrEmit** | **ParallelFirst** | **580,385.156 ns** | **38,580.3197 ns** | **20,178.2532 ns** |      **-** |     **-** |     **-** |      **33 B** |
| **ReadOrEmit** |  **ParallelMiss** | **584,503.835 ns** | **26,522.3542 ns** | **13,871.7041 ns** |      **-** |     **-** |     **-** | **147,486 B** |
| **ReadOrEmit** |  **ParallelMix2** | **576,837.826 ns** | **25,307.9303 ns** | **13,236.5369 ns** |      **-** |     **-** |     **-** |      **28 B** |
| **ReadOrEmit** |    **QueueFirst** |      **92.649 ns** |      **3.5285 ns** |      **1.8455 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **QueueMany** |     **415.807 ns** |      **4.6559 ns** |      **2.4351 ns** |      **-** |     **-** |     **-** |      **96 B** |
| **ReadOrEmit** |     **QueueMix2** |     **192.198 ns** |     **11.0383 ns** |      **5.7732 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **QueueOff** |       **6.241 ns** |      **0.3705 ns** |      **0.1938 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |   **QueueSecond** |      **96.720 ns** |      **1.1788 ns** |      **0.6165 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |  **TagsFallback** |      **50.183 ns** |      **1.7437 ns** |      **0.9120 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **TagsFirst** |      **51.758 ns** |      **2.9523 ns** |      **1.5441 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **TagsIPv6** |      **61.856 ns** |      **0.6674 ns** |      **0.3491 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **TagsMix2** |     **106.236 ns** |      **5.1391 ns** |      **2.6878 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |  **TagsOverride** |      **57.030 ns** |      **5.4913 ns** |      **2.8721 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |    **TagsSecond** |      **53.275 ns** |      **1.0178 ns** |      **0.5323 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **TagsThird** |      **61.161 ns** |      **7.9426 ns** |      **4.1541 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
