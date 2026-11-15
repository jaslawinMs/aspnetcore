``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|         Method |            Case |        Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------- |---------------- |------------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **ResourceFilter** |      **ExactJson1** |   **154.20 ns** |   **7.518 ns** |   **3.932 ns** | **0.0062** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |     **ExactJson32** |   **419.88 ns** |  **18.113 ns** |   **9.473 ns** | **0.0173** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |      **ExactJson8** |   **216.83 ns** |   **9.165 ns** |   **4.793 ns** | **0.0065** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |      **ExactLong1** |   **274.22 ns** |   **6.134 ns** |   **3.208 ns** | **0.0055** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |    **ExactParams1** |   **367.51 ns** |   **5.341 ns** |   **2.794 ns** | **0.0037** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |   **ExactParams32** |   **672.10 ns** |  **20.884 ns** |  **10.923 ns** | **0.0198** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |    **ExactParams8** |   **458.04 ns** |  **45.763 ns** |  **23.935 ns** | **0.0044** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |    **ExactVendor1** |   **186.82 ns** |   **5.738 ns** |   **3.001 ns** | **0.0056** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |   **ExactVendor32** |   **467.97 ns** |  **13.920 ns** |   **7.281 ns** | **0.0182** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |      **LastJson32** | **1,784.12 ns** |  **54.504 ns** |  **28.506 ns** | **0.0176** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |       **LastJson8** |   **526.55 ns** |  **55.239 ns** |  **28.891 ns** | **0.0052** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |    **LastParams32** | **2,050.31 ns** | **198.543 ns** | **103.842 ns** | **0.0198** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |       **MissJson1** |   **167.37 ns** |  **10.936 ns** |   **5.720 ns** | **0.0067** |     **-** |     **-** |     **256 B** |
| **ResourceFilter** |      **MissJson32** | **1,859.35 ns** | **188.409 ns** |  **98.542 ns** | **0.0179** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |       **MissJson8** |   **533.57 ns** |   **9.482 ns** |   **4.959 ns** | **0.0054** |     **-** |     **-** |     **344 B** |
| **ResourceFilter** |      **MixedJson1** |   **157.25 ns** |  **13.190 ns** |   **6.898 ns** | **0.0048** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |     **MixedJson32** |   **448.97 ns** |  **30.562 ns** |  **15.984 ns** | **0.0175** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |   **MoreSpecific1** |   **157.46 ns** |   **6.998 ns** |   **3.660 ns** | **0.0050** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |  **MoreSpecific32** |   **481.77 ns** |  **76.698 ns** |  **40.114 ns** | **0.0183** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** | **NoDeclaredTypes** |    **68.38 ns** |   **2.887 ns** |   **1.510 ns** | **0.0034** |     **-** |     **-** |     **136 B** |
| **ResourceFilter** |        **NoFormat** |    **15.04 ns** |   **0.609 ns** |   **0.319 ns** |      **-** |     **-** |     **-** |         **-** |
| **ResourceFilter** |     **NoProviders** |    **57.36 ns** |   **1.764 ns** |   **0.923 ns** | **0.0035** |     **-** |     **-** |     **136 B** |
| **ResourceFilter** |      **ParamMiss1** |   **255.10 ns** |   **3.354 ns** |   **1.754 ns** | **0.0051** |     **-** |     **-** |     **256 B** |
| **ResourceFilter** |     **ParamMiss32** | **3,999.67 ns** | **329.231 ns** | **172.194 ns** |      **-** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |     **QueryExact1** |   **180.92 ns** |   **3.849 ns** |   **2.013 ns** | **0.0055** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |    **QueryExact32** |   **494.59 ns** |  **28.496 ns** |  **14.904 ns** | **0.0195** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |     **QueryMiss32** | **1,837.29 ns** |  **95.629 ns** |  **50.016 ns** | **0.0183** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |         **Suffix1** |   **171.48 ns** |   **6.779 ns** |   **3.546 ns** | **0.0051** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |        **Suffix32** |   **476.42 ns** |  **18.848 ns** |   **9.858 ns** | **0.0189** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |   **UnknownFormat** |    **24.82 ns** |   **0.263 ns** |   **0.138 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
