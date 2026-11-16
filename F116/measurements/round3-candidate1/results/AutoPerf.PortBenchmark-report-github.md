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
| **ReadOrEmit** |      **GetFirst** |       **6.690 ns** |      **0.1625 ns** |      **0.0850 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |       **GetMix2** |      **14.858 ns** |      **0.3140 ns** |      **0.1642 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |       **GetMix4** |      **42.311 ns** |      **0.5712 ns** |      **0.2987 ns** | **0.0009** |     **-** |     **-** |      **48 B** |
| **ReadOrEmit** |     **GetSecond** |       **7.821 ns** |      **0.1019 ns** |      **0.0533 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **GetThird** |      **13.463 ns** |      **0.3730 ns** |      **0.1951 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **ReadOrEmit** |     **ListFirst** |      **45.359 ns** |      **0.8321 ns** |      **0.4352 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **ListMix2** |      **91.022 ns** |      **1.2548 ns** |      **0.6563 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |    **ListSecond** |      **46.756 ns** |      **0.4553 ns** |      **0.2381 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **ListThird** |      **53.705 ns** |      **1.4645 ns** |      **0.7660 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **ReadOrEmit** | **ParallelFirst** | **565,373.047 ns** | **37,246.7266 ns** | **19,480.7582 ns** |      **-** |     **-** |     **-** |      **42 B** |
| **ReadOrEmit** |  **ParallelMiss** | **568,072.230 ns** | **23,801.3211 ns** | **12,448.5511 ns** |      **-** |     **-** |     **-** | **147,486 B** |
| **ReadOrEmit** |  **ParallelMix2** | **560,708.239 ns** | **32,101.0464 ns** | **16,789.4680 ns** |      **-** |     **-** |     **-** |      **29 B** |
| **ReadOrEmit** |    **QueueFirst** |      **89.736 ns** |      **2.9615 ns** |      **1.5489 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **QueueMany** |     **406.326 ns** |      **6.6781 ns** |      **3.4928 ns** |      **-** |     **-** |     **-** |      **96 B** |
| **ReadOrEmit** |     **QueueMix2** |     **182.764 ns** |      **2.4490 ns** |      **1.2809 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **QueueOff** |       **6.131 ns** |      **0.0438 ns** |      **0.0229 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |   **QueueSecond** |      **93.871 ns** |      **0.8065 ns** |      **0.4218 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |  **TagsFallback** |      **48.125 ns** |      **0.3675 ns** |      **0.1922 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **TagsFirst** |      **47.493 ns** |      **0.5727 ns** |      **0.2995 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **TagsIPv6** |      **58.651 ns** |      **0.7066 ns** |      **0.3696 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **TagsMix2** |      **98.339 ns** |      **3.2701 ns** |      **1.7103 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |  **TagsOverride** |      **52.637 ns** |      **0.4086 ns** |      **0.2137 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |    **TagsSecond** |      **50.522 ns** |      **1.2892 ns** |      **0.6743 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **TagsThird** |      **55.204 ns** |      **0.8471 ns** |      **0.4430 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
