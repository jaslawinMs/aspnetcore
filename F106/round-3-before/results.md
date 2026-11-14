``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|           Method |               Case |          Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |------------------- |--------------:|-------------:|-------------:|-------:|------:|------:|----------:|
| **GetCurrentValues** |     **Alias_Names_16** |   **9,333.65 ns** |   **221.874 ns** |   **116.045 ns** | **0.1863** |     **-** |     **-** |   **8,528 B** |
| **GetCurrentValues** |   **Alias_Numbers_16** |   **9,439.91 ns** |   **125.881 ns** |    **65.838 ns** | **0.1885** |     **-** |     **-** |   **8,528 B** |
| **GetCurrentValues** |     **Alias_Typed_16** |   **2,759.95 ns** |   **170.069 ns** |    **88.949 ns** | **0.1055** |     **-** |     **-** |   **4,824 B** |
| **GetCurrentValues** |  **Flags_Combined_16** |   **9,695.11 ns** |   **142.364 ns** |    **74.459 ns** | **0.1935** |     **-** |     **-** |   **8,529 B** |
| **GetCurrentValues** |   **Large_Invalid_64** |  **30,507.71 ns** |   **465.579 ns** |   **243.507 ns** | **0.3034** |     **-** |     **-** |  **15,056 B** |
| **GetCurrentValues** |  **Large_Iterator_64** |  **65,857.55 ns** |   **685.087 ns** |   **358.314 ns** | **0.6649** |     **-** |     **-** |  **25,812 B** |
| **GetCurrentValues** | **Large_Lowercase_64** |  **41,449.54 ns** |   **588.074 ns** |   **307.574 ns** | **0.4167** |     **-** |     **-** |  **18,266 B** |
| **GetCurrentValues** |     **Large_Mixed_64** |  **31,644.96 ns** |   **525.976 ns** |   **275.095 ns** | **0.3141** |     **-** |     **-** |  **15,346 B** |
| **GetCurrentValues** |      **Large_Names_1** |   **1,503.44 ns** |   **138.401 ns** |    **72.386 ns** | **0.0148** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Large_Names_2** |   **2,873.70 ns** |    **27.251 ns** |    **14.253 ns** | **0.0285** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Large_Names_64** | **103,064.61 ns** |   **966.293 ns** |   **505.390 ns** | **1.0246** |     **-** |     **-** |  **40,693 B** |
| **GetCurrentValues** |      **Large_Names_8** |  **11,356.28 ns** |   **139.778 ns** |    **73.107 ns** | **0.1126** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |    **Large_Numbers_1** |   **1,505.07 ns** |    **52.767 ns** |    **27.598 ns** | **0.0152** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Large_Numbers_2** |   **2,919.81 ns** |   **103.503 ns** |    **54.134 ns** | **0.0286** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Large_Numbers_64** |  **96,670.51 ns** | **5,910.219 ns** | **3,091.159 ns** | **0.9470** |     **-** |     **-** |  **40,693 B** |
| **GetCurrentValues** |    **Large_Numbers_8** |  **11,160.23 ns** |   **419.273 ns** |   **219.288 ns** | **0.1104** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |  **Large_TwoValid_64** |  **32,319.73 ns** |   **341.108 ns** |   **178.406 ns** | **0.3205** |     **-** |     **-** |  **15,826 B** |
| **GetCurrentValues** |      **Large_Typed_1** |     **968.54 ns** |    **12.691 ns** |     **6.637 ns** | **0.0097** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Large_Typed_2** |   **1,944.00 ns** |    **19.166 ns** |    **10.024 ns** | **0.0193** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Large_Typed_64** |  **66,813.15 ns** |   **970.460 ns** |   **507.569 ns** | **0.6649** |     **-** |     **-** |  **25,852 B** |
| **GetCurrentValues** |      **Large_Typed_8** |   **7,543.06 ns** |   **179.735 ns** |    **94.005 ns** | **0.0749** |     **-** |     **-** |   **3,104 B** |
| **GetCurrentValues** |   **Large_Unknown_64** |  **84,336.80 ns** | **1,301.382 ns** |   **680.648 ns** | **0.8333** |     **-** |     **-** |  **35,540 B** |
| **GetCurrentValues** |      **Small_Empty_0** |      **39.24 ns** |     **1.983 ns** |     **1.037 ns** | **0.0017** |     **-** |     **-** |      **64 B** |
| **GetCurrentValues** |   **Small_Invalid_64** |  **28,026.84 ns** |   **426.020 ns** |   **222.817 ns** | **0.2854** |     **-** |     **-** |  **15,058 B** |
| **GetCurrentValues** |  **Small_Iterator_64** |  **15,691.34 ns** |   **358.531 ns** |   **187.519 ns** | **0.4618** |     **-** |     **-** |  **19,193 B** |
| **GetCurrentValues** | **Small_Lowercase_64** |  **29,576.98 ns** |   **388.349 ns** |   **203.114 ns** | **0.2934** |     **-** |     **-** |  **15,642 B** |
| **GetCurrentValues** |     **Small_Mixed_64** |  **28,126.57 ns** |   **445.366 ns** |   **232.935 ns** | **0.2790** |     **-** |     **-** |  **15,345 B** |
| **GetCurrentValues** |      **Small_Names_1** |     **790.03 ns** |    **53.938 ns** |    **28.211 ns** | **0.0157** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Small_Names_2** |   **1,447.10 ns** |    **59.630 ns** |    **31.187 ns** | **0.0287** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Small_Names_64** |  **43,399.99 ns** |   **811.453 ns** |   **424.405 ns** | **0.8621** |     **-** |     **-** |  **34,074 B** |
| **GetCurrentValues** |      **Small_Names_8** |   **5,599.41 ns** |    **70.935 ns** |    **37.100 ns** | **0.1108** |     **-** |     **-** |   **4,952 B** |
| **GetCurrentValues** |    **Small_Numbers_1** |     **784.33 ns** |    **22.501 ns** |    **11.769 ns** | **0.0158** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Small_Numbers_2** |   **1,427.65 ns** |    **22.426 ns** |    **11.729 ns** | **0.0289** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Small_Numbers_64** |  **41,981.08 ns** |   **619.135 ns** |   **323.820 ns** | **0.4596** |     **-** |     **-** |  **34,074 B** |
| **GetCurrentValues** |    **Small_Numbers_8** |   **5,597.75 ns** |    **87.407 ns** |    **45.716 ns** | **0.1126** |     **-** |     **-** |   **4,952 B** |
| **GetCurrentValues** |      **Small_Typed_1** |     **289.53 ns** |     **9.433 ns** |     **4.934 ns** | **0.0118** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Small_Typed_2** |     **639.94 ns** |    **51.877 ns** |    **27.133 ns** | **0.0229** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Small_Typed_64** |  **15,720.10 ns** |   **567.390 ns** |   **296.756 ns** | **0.4921** |     **-** |     **-** |  **19,233 B** |
| **GetCurrentValues** |      **Small_Typed_8** |   **2,154.57 ns** |   **101.064 ns** |    **52.858 ns** | **0.0633** |     **-** |     **-** |   **3,104 B** |
| **GetCurrentValues** |   **Small_Unknown_64** |  **40,295.52 ns** | **1,190.654 ns** |   **622.735 ns** | **0.7962** |     **-** |     **-** |  **35,538 B** |
| **GetCurrentValues** |    **String_Typed_64** |   **1,911.20 ns** |    **92.136 ns** |    **48.189 ns** | **0.0760** |     **-** |     **-** |   **3,424 B** |
