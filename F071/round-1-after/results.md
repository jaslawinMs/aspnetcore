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
| **ResourceFilter** |      **ExactJson1** |   **144.50 ns** |   **5.746 ns** |   **3.005 ns** | **0.0059** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |     **ExactJson32** |   **460.40 ns** |  **20.324 ns** |  **10.630 ns** | **0.0184** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |      **ExactJson8** |   **204.33 ns** |  **21.694 ns** |  **11.347 ns** | **0.0080** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |      **ExactLong1** |   **206.36 ns** |   **6.370 ns** |   **3.332 ns** | **0.0062** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |    **ExactParams1** |   **340.34 ns** |  **16.363 ns** |   **8.558 ns** | **0.0034** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |   **ExactParams32** |   **687.79 ns** |  **74.988 ns** |  **39.220 ns** | **0.0201** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |    **ExactParams8** |   **422.90 ns** |  **32.584 ns** |  **17.042 ns** | **0.0083** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |    **ExactVendor1** |   **153.80 ns** |   **6.545 ns** |   **3.423 ns** | **0.0061** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |   **ExactVendor32** |   **495.85 ns** |  **88.894 ns** |  **46.493 ns** | **0.0191** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |      **LastJson32** | **1,953.94 ns** |  **44.326 ns** |  **23.183 ns** | **0.0194** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |       **LastJson8** |   **561.36 ns** |  **25.381 ns** |  **13.275 ns** | **0.0054** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |    **LastParams32** | **2,166.58 ns** |  **28.675 ns** |  **14.998 ns** |      **-** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |       **MissJson1** |   **179.10 ns** |  **12.722 ns** |   **6.654 ns** | **0.0052** |     **-** |     **-** |     **256 B** |
| **ResourceFilter** |      **MissJson32** | **2,020.27 ns** |  **41.759 ns** |  **21.841 ns** | **0.0203** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |       **MissJson8** |   **588.50 ns** |  **28.203 ns** |  **14.751 ns** | **0.0058** |     **-** |     **-** |     **344 B** |
| **ResourceFilter** |      **MixedJson1** |   **165.46 ns** |  **10.525 ns** |   **5.505 ns** | **0.0049** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |     **MixedJson32** |   **501.99 ns** |  **48.922 ns** |  **25.587 ns** | **0.0192** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |   **MoreSpecific1** |   **172.63 ns** |  **11.582 ns** |   **6.058 ns** | **0.0051** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |  **MoreSpecific32** |   **499.23 ns** |  **29.166 ns** |  **15.255 ns** | **0.0200** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** | **NoDeclaredTypes** |    **69.00 ns** |   **3.103 ns** |   **1.623 ns** | **0.0035** |     **-** |     **-** |     **136 B** |
| **ResourceFilter** |        **NoFormat** |    **14.15 ns** |   **0.388 ns** |   **0.203 ns** |      **-** |     **-** |     **-** |         **-** |
| **ResourceFilter** |     **NoProviders** |    **55.36 ns** |   **3.182 ns** |   **1.664 ns** | **0.0035** |     **-** |     **-** |     **136 B** |
| **ResourceFilter** |      **ParamMiss1** |   **263.47 ns** |  **22.068 ns** |  **11.542 ns** | **0.0051** |     **-** |     **-** |     **256 B** |
| **ResourceFilter** |     **ParamMiss32** | **4,184.73 ns** | **544.938 ns** | **285.013 ns** |      **-** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |     **QueryExact1** |   **158.16 ns** |   **5.690 ns** |   **2.976 ns** | **0.0060** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |    **QueryExact32** |   **478.21 ns** |  **22.627 ns** |  **11.834 ns** | **0.0191** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |     **QueryMiss32** | **2,040.19 ns** |  **55.172 ns** |  **28.856 ns** | **0.0203** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |         **Suffix1** |   **171.38 ns** |   **8.518 ns** |   **4.455 ns** | **0.0050** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |        **Suffix32** |   **512.57 ns** |  **30.586 ns** |  **15.997 ns** | **0.0197** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |   **UnknownFormat** |    **25.60 ns** |   **1.707 ns** |   **0.893 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
