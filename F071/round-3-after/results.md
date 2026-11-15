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
| **ResourceFilter** |      **ExactJson1** |    **83.14 ns** |  **4.058 ns** |  **2.122 ns** | **0.0059** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |     **ExactJson32** |   **337.43 ns** | **11.202 ns** |  **5.859 ns** | **0.0194** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |      **ExactJson8** |   **134.26 ns** |  **4.607 ns** |  **2.409 ns** | **0.0080** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |      **ExactLong1** |    **86.25 ns** |  **2.153 ns** |  **1.126 ns** | **0.0061** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |    **ExactParams1** |   **336.05 ns** |  **8.442 ns** |  **4.415 ns** | **0.0033** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |   **ExactParams32** |   **609.00 ns** | **23.081 ns** | **12.072 ns** | **0.0181** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |    **ExactParams8** |   **419.29 ns** | **40.536 ns** | **21.201 ns** | **0.0083** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |    **ExactVendor1** |    **83.59 ns** |  **3.402 ns** |  **1.779 ns** | **0.0060** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |   **ExactVendor32** |   **339.38 ns** | **17.872 ns** |  **9.348 ns** | **0.0195** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |      **LastJson32** | **2,252.14 ns** | **21.241 ns** | **11.109 ns** |      **-** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |       **LastJson8** |   **635.24 ns** | **15.957 ns** |  **8.346 ns** | **0.0062** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |    **LastParams32** | **2,371.33 ns** | **63.804 ns** | **33.371 ns** |      **-** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |       **MissJson1** |   **179.21 ns** |  **9.476 ns** |  **4.956 ns** | **0.0054** |     **-** |     **-** |     **256 B** |
| **ResourceFilter** |      **MissJson32** | **2,201.08 ns** | **18.991 ns** |  **9.933 ns** |      **-** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |       **MissJson8** |   **650.81 ns** |  **8.113 ns** |  **4.243 ns** | **0.0065** |     **-** |     **-** |     **344 B** |
| **ResourceFilter** |      **MixedJson1** |   **169.83 ns** |  **4.043 ns** |  **2.115 ns** | **0.0052** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |     **MixedJson32** |   **420.98 ns** | **14.010 ns** |  **7.328 ns** | **0.0168** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |   **MoreSpecific1** |   **175.50 ns** |  **4.041 ns** |  **2.113 ns** | **0.0053** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |  **MoreSpecific32** |   **430.58 ns** | **19.450 ns** | **10.172 ns** | **0.0165** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** | **NoDeclaredTypes** |    **59.53 ns** |  **2.360 ns** |  **1.234 ns** | **0.0031** |     **-** |     **-** |     **136 B** |
| **ResourceFilter** |        **NoFormat** |    **14.73 ns** |  **0.241 ns** |  **0.126 ns** |      **-** |     **-** |     **-** |         **-** |
| **ResourceFilter** |     **NoProviders** |    **48.73 ns** |  **5.840 ns** |  **3.054 ns** | **0.0034** |     **-** |     **-** |     **136 B** |
| **ResourceFilter** |      **ParamMiss1** |   **247.98 ns** |  **6.610 ns** |  **3.457 ns** | **0.0049** |     **-** |     **-** |     **256 B** |
| **ResourceFilter** |     **ParamMiss32** | **4,110.37 ns** | **84.066 ns** | **43.968 ns** |      **-** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |     **QueryExact1** |   **102.49 ns** |  **3.771 ns** |  **1.972 ns** | **0.0061** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |    **QueryExact32** |   **343.69 ns** | **25.908 ns** | **13.550 ns** | **0.0170** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |     **QueryMiss32** | **2,237.85 ns** | **48.192 ns** | **25.205 ns** |      **-** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |         **Suffix1** |   **179.70 ns** |  **4.064 ns** |  **2.126 ns** | **0.0054** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |        **Suffix32** |   **428.57 ns** | **12.148 ns** |  **6.354 ns** | **0.0171** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |   **UnknownFormat** |    **23.94 ns** |  **1.922 ns** |  **1.005 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
