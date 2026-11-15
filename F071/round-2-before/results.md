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
| **ResourceFilter** |      **ExactJson1** |   **499.05 ns** | **612.779 ns** | **320.495 ns** |      **-** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |     **ExactJson32** |   **413.10 ns** |   **9.428 ns** |   **4.931 ns** | **0.0202** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |      **ExactJson8** |   **209.64 ns** |   **4.737 ns** |   **2.478 ns** | **0.0082** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |      **ExactLong1** |   **268.74 ns** |   **5.304 ns** |   **2.774 ns** | **0.0054** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |    **ExactParams1** |   **361.50 ns** |   **3.203 ns** |   **1.675 ns** | **0.0036** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |   **ExactParams32** |   **652.36 ns** |  **20.605 ns** |  **10.777 ns** | **0.0194** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |    **ExactParams8** |   **436.84 ns** |   **5.973 ns** |   **3.124 ns** | **0.0086** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |    **ExactVendor1** |   **184.97 ns** |   **4.616 ns** |   **2.414 ns** | **0.0055** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |   **ExactVendor32** |   **443.40 ns** |  **14.829 ns** |   **7.756 ns** | **0.0177** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |      **LastJson32** | **1,737.19 ns** |  **14.925 ns** |   **7.806 ns** | **0.0175** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |       **LastJson8** |   **514.91 ns** |  **17.488 ns** |   **9.147 ns** | **0.0052** |     **-** |     **-** |     **320 B** |
| **ResourceFilter** |    **LastParams32** | **1,977.86 ns** |  **18.740 ns** |   **9.801 ns** | **0.0196** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |       **MissJson1** |   **164.26 ns** |   **4.857 ns** |   **2.540 ns** | **0.0067** |     **-** |     **-** |     **256 B** |
| **ResourceFilter** |      **MissJson32** | **1,750.36 ns** |  **16.281 ns** |   **8.515 ns** | **0.0176** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |       **MissJson8** |   **521.67 ns** |  **13.349 ns** |   **6.982 ns** | **0.0052** |     **-** |     **-** |     **344 B** |
| **ResourceFilter** |      **MixedJson1** |   **154.83 ns** |   **6.403 ns** |   **3.349 ns** | **0.0061** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |     **MixedJson32** |   **412.37 ns** |  **17.088 ns** |   **8.937 ns** | **0.0166** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |   **MoreSpecific1** |   **155.91 ns** |  **10.623 ns** |   **5.556 ns** | **0.0061** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |  **MoreSpecific32** |   **424.40 ns** |  **17.188 ns** |   **8.990 ns** | **0.0201** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** | **NoDeclaredTypes** |    **60.78 ns** |   **2.080 ns** |   **1.088 ns** | **0.0031** |     **-** |     **-** |     **136 B** |
| **ResourceFilter** |        **NoFormat** |    **15.49 ns** |   **0.306 ns** |   **0.160 ns** |      **-** |     **-** |     **-** |         **-** |
| **ResourceFilter** |     **NoProviders** |    **49.37 ns** |   **4.639 ns** |   **2.426 ns** | **0.0036** |     **-** |     **-** |     **136 B** |
| **ResourceFilter** |      **ParamMiss1** |   **240.14 ns** |   **6.301 ns** |   **3.295 ns** | **0.0050** |     **-** |     **-** |     **256 B** |
| **ResourceFilter** |     **ParamMiss32** | **3,811.59 ns** |  **72.400 ns** |  **37.867 ns** |      **-** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |     **QueryExact1** |   **171.23 ns** |  **15.008 ns** |   **7.850 ns** | **0.0052** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |    **QueryExact32** |   **426.66 ns** |  **12.792 ns** |   **6.690 ns** | **0.0169** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |     **QueryMiss32** | **1,781.41 ns** |  **24.194 ns** |  **12.654 ns** | **0.0176** |     **-** |     **-** |     **776 B** |
| **ResourceFilter** |         **Suffix1** |   **160.27 ns** |   **3.138 ns** |   **1.641 ns** | **0.0048** |     **-** |     **-** |     **232 B** |
| **ResourceFilter** |        **Suffix32** |   **418.30 ns** |  **13.673 ns** |   **7.151 ns** | **0.0165** |     **-** |     **-** |     **752 B** |
| **ResourceFilter** |   **UnknownFormat** |    **23.53 ns** |   **1.865 ns** |   **0.976 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
