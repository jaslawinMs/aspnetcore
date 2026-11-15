``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|         Method |            Case |        Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------- |---------------- |------------:|----------:|----------:|-------:|------:|------:|----------:|
| **ResourceFilter** |      **ExactJson1** |   **116.40 ns** |  **4.699 ns** |  **2.457 ns** | **0.0059** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |     **ExactJson32** |   **368.96 ns** | **11.750 ns** |  **6.145 ns** | **0.0179** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |      **ExactJson8** |   **173.14 ns** |  **3.837 ns** |  **2.007 ns** | **0.0083** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |      **ExactLong1** |   **185.78 ns** |  **3.800 ns** |  **1.988 ns** | **0.0056** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |    **ExactParams1** |   **357.33 ns** |  **7.126 ns** |  **3.727 ns** | **0.0035** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |   **ExactParams32** |   **649.71 ns** | **10.410 ns** |  **5.444 ns** | **0.0195** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |    **ExactParams8** |   **425.34 ns** |  **5.400 ns** |  **2.824 ns** | **0.0043** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |    **ExactVendor1** |   **119.57 ns** |  **3.511 ns** |  **1.836 ns** | **0.0058** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |   **ExactVendor32** |   **414.57 ns** | **12.806 ns** |  **6.698 ns** | **0.0165** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |      **LastJson32** | **2,299.68 ns** | **50.737 ns** | **26.537 ns** |      **-** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |       **LastJson8** |   **641.49 ns** | **11.856 ns** |  **6.201 ns** | **0.0064** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |    **LastParams32** | **2,503.74 ns** | **54.782 ns** | **28.652 ns** |      **-** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |       **MissJson1** |   **189.01 ns** |  **7.378 ns** |  **3.859 ns** | **0.0057** |     **-** |     **-** |     **256 B** |
| **ResourceFilter** |      **MissJson32** | **2,275.91 ns** | **30.278 ns** | **15.836 ns** |      **-** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |       **MissJson8** |   **646.80 ns** |  **6.208 ns** |  **3.247 ns** | **0.0065** |     **-** |     **-** |     **344 B** |
| **ResourceFilter** |      **MixedJson1** |   **173.91 ns** |  **4.482 ns** |  **2.344 ns** | **0.0052** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |     **MixedJson32** |   **438.03 ns** | **17.220 ns** |  **9.006 ns** | **0.0171** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |   **MoreSpecific1** |   **169.06 ns** |  **3.869 ns** |  **2.023 ns** | **0.0051** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |  **MoreSpecific32** |   **437.15 ns** | **17.719 ns** |  **9.267 ns** | **0.0173** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** | **NoDeclaredTypes** |    **63.16 ns** |  **2.709 ns** |  **1.417 ns** | **0.0032** |     **-** |     **-** |     **136 B** |
| **ResourceFilter** |        **NoFormat** |    **15.88 ns** |  **0.484 ns** |  **0.253 ns** |      **-** |     **-** |     **-** |         **-** |
| **ResourceFilter** |     **NoProviders** |    **47.92 ns** |  **1.480 ns** |  **0.774 ns** | **0.0035** |     **-** |     **-** |     **136 B** |
| **ResourceFilter** |      **ParamMiss1** |   **254.70 ns** |  **5.011 ns** |  **2.621 ns** | **0.0051** |     **-** |     **-** |     **256 B** |
| **ResourceFilter** |     **ParamMiss32** | **4,107.70 ns** | **58.215 ns** | **30.448 ns** |      **-** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |     **QueryExact1** |   **125.31 ns** |  **4.235 ns** |  **2.215 ns** | **0.0051** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |    **QueryExact32** |   **389.26 ns** | **12.195 ns** |  **6.378 ns** | **0.0191** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |     **QueryMiss32** | **2,251.75 ns** | **48.280 ns** | **25.251 ns** |      **-** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |         **Suffix1** |   **172.44 ns** |  **8.297 ns** |  **4.339 ns** | **0.0052** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |        **Suffix32** |   **430.95 ns** | **15.197 ns** |  **7.949 ns** | **0.0175** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |   **UnknownFormat** |    **24.22 ns** |  **0.624 ns** |  **0.326 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
