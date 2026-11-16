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
| **ReadOrEmit** |      **GetFirst** |       **8.032 ns** |      **2.0531 ns** |      **1.0738 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |       **GetMix2** |      **16.563 ns** |      **0.1954 ns** |      **0.1022 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |       **GetMix4** |      **47.288 ns** |      **3.7363 ns** |      **1.9541 ns** | **0.0010** |     **-** |     **-** |      **48 B** |
| **ReadOrEmit** |     **GetSecond** |       **8.876 ns** |      **0.3588 ns** |      **0.1876 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **GetThird** |      **15.122 ns** |      **0.3823 ns** |      **0.1999 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
| **ReadOrEmit** |     **ListFirst** |      **54.509 ns** |      **3.6703 ns** |      **1.9196 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **ListMix2** |     **106.578 ns** |     **10.3540 ns** |      **5.4153 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |    **ListSecond** |      **53.995 ns** |      **2.0656 ns** |      **1.0804 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **ListThird** |      **62.912 ns** |      **1.7313 ns** |      **0.9055 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **ReadOrEmit** | **ParallelFirst** | **574,773.926 ns** | **28,918.1169 ns** | **15,124.7343 ns** |      **-** |     **-** |     **-** |      **42 B** |
| **ReadOrEmit** |  **ParallelMiss** | **584,986.293 ns** | **41,190.7126 ns** | **21,543.5391 ns** |      **-** |     **-** |     **-** | **147,486 B** |
| **ReadOrEmit** |  **ParallelMix2** | **575,243.164 ns** | **22,602.1734 ns** | **11,821.3737 ns** |      **-** |     **-** |     **-** |      **28 B** |
| **ReadOrEmit** |    **QueueFirst** |     **104.705 ns** |      **5.9807 ns** |      **3.1280 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **QueueMany** |     **448.968 ns** |     **20.3505 ns** |     **10.6437 ns** |      **-** |     **-** |     **-** |      **96 B** |
| **ReadOrEmit** |     **QueueMix2** |     **205.639 ns** |      **2.6595 ns** |      **1.3909 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **QueueOff** |       **6.076 ns** |      **0.1573 ns** |      **0.0823 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |   **QueueSecond** |     **107.307 ns** |      **7.4711 ns** |      **3.9075 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |  **TagsFallback** |      **55.989 ns** |      **2.8487 ns** |      **1.4899 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **TagsFirst** |      **60.672 ns** |      **3.3206 ns** |      **1.7368 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **TagsIPv6** |      **72.254 ns** |      **2.8061 ns** |      **1.4676 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |      **TagsMix2** |     **120.846 ns** |      **3.2599 ns** |      **1.7050 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |  **TagsOverride** |      **59.220 ns** |      **1.7096 ns** |      **0.8941 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |    **TagsSecond** |      **63.568 ns** |      **1.5955 ns** |      **0.8345 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrEmit** |     **TagsThird** |      **71.508 ns** |      **6.9103 ns** |      **3.6142 ns** |      **-** |     **-** |     **-** |      **24 B** |
