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
| **GetCurrentValues** |     **Alias_Names_16** |   **9,672.95 ns** |   **102.449 ns** |    **53.583 ns** | **0.1944** |     **-** |     **-** |   **8,528 B** |
| **GetCurrentValues** |   **Alias_Numbers_16** |   **9,772.23 ns** |   **140.188 ns** |    **73.321 ns** | **0.1944** |     **-** |     **-** |   **8,529 B** |
| **GetCurrentValues** |     **Alias_Typed_16** |   **2,794.38 ns** |   **106.270 ns** |    **55.581 ns** | **0.1096** |     **-** |     **-** |   **4,824 B** |
| **GetCurrentValues** |  **Flags_Combined_16** |  **10,002.44 ns** |   **172.260 ns** |    **90.095 ns** | **0.1987** |     **-** |     **-** |   **8,529 B** |
| **GetCurrentValues** |   **Large_Invalid_64** |  **29,635.22 ns** |   **306.923 ns** |   **160.527 ns** | **0.3205** |     **-** |     **-** |  **15,057 B** |
| **GetCurrentValues** |  **Large_Iterator_64** |  **67,803.35 ns** | **1,076.299 ns** |   **562.925 ns** | **0.6793** |     **-** |     **-** |  **25,812 B** |
| **GetCurrentValues** | **Large_Lowercase_64** |  **38,576.26 ns** | **2,497.043 ns** | **1,306.002 ns** | **0.3788** |     **-** |     **-** |  **18,266 B** |
| **GetCurrentValues** |     **Large_Mixed_64** |  **30,812.93 ns** |   **353.322 ns** |   **184.794 ns** | **0.3125** |     **-** |     **-** |  **15,346 B** |
| **GetCurrentValues** |      **Large_Names_1** |   **1,528.42 ns** |    **47.366 ns** |    **24.774 ns** | **0.0150** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Large_Names_2** |   **2,890.55 ns** |    **33.790 ns** |    **17.673 ns** | **0.0287** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Large_Names_64** | **101,907.56 ns** | **1,383.985 ns** |   **723.851 ns** | **1.0246** |     **-** |     **-** |  **40,693 B** |
| **GetCurrentValues** |      **Large_Names_8** |  **11,367.65 ns** |   **130.517 ns** |    **68.263 ns** | **0.1128** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |    **Large_Numbers_1** |   **1,507.48 ns** |    **22.998 ns** |    **12.029 ns** | **0.0151** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Large_Numbers_2** |   **2,865.64 ns** |    **33.613 ns** |    **17.580 ns** | **0.0286** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Large_Numbers_64** |  **97,593.83 ns** | **2,256.335 ns** | **1,180.107 ns** | **0.9615** |     **-** |     **-** |  **40,693 B** |
| **GetCurrentValues** |    **Large_Numbers_8** |  **11,282.29 ns** |   **203.411 ns** |   **106.388 ns** | **0.1122** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |  **Large_TwoValid_64** |  **32,948.30 ns** | **2,544.616 ns** | **1,330.884 ns** | **0.3189** |     **-** |     **-** |  **15,826 B** |
| **GetCurrentValues** |      **Large_Typed_1** |     **967.90 ns** |    **10.953 ns** |     **5.728 ns** | **0.0100** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Large_Typed_2** |   **1,951.54 ns** |    **29.672 ns** |    **15.519 ns** | **0.0194** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Large_Typed_64** |  **66,961.45 ns** | **1,257.579 ns** |   **657.738 ns** | **0.6649** |     **-** |     **-** |  **25,851 B** |
| **GetCurrentValues** |      **Large_Typed_8** |   **7,674.00 ns** |   **167.009 ns** |    **87.349 ns** | **0.0763** |     **-** |     **-** |   **3,104 B** |
| **GetCurrentValues** |   **Large_Unknown_64** |  **84,839.48 ns** |   **834.040 ns** |   **436.219 ns** | **0.8446** |     **-** |     **-** |  **35,540 B** |
| **GetCurrentValues** |      **Small_Empty_0** |      **41.26 ns** |     **1.415 ns** |     **0.740 ns** | **0.0014** |     **-** |     **-** |      **64 B** |
| **GetCurrentValues** |   **Small_Invalid_64** |  **28,220.33 ns** |   **416.748 ns** |   **217.967 ns** | **0.2948** |     **-** |     **-** |  **15,058 B** |
| **GetCurrentValues** |  **Small_Iterator_64** |  **15,290.71 ns** |   **180.934 ns** |    **94.632 ns** | **0.4641** |     **-** |     **-** |  **19,193 B** |
| **GetCurrentValues** | **Small_Lowercase_64** |  **29,861.29 ns** |   **361.971 ns** |   **189.318 ns** | **0.2948** |     **-** |     **-** |  **15,642 B** |
| **GetCurrentValues** |     **Small_Mixed_64** |  **28,428.61 ns** |   **259.902 ns** |   **135.934 ns** | **0.2815** |     **-** |     **-** |  **15,345 B** |
| **GetCurrentValues** |      **Small_Names_1** |     **798.52 ns** |    **32.357 ns** |    **16.923 ns** | **0.0160** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Small_Names_2** |   **1,477.48 ns** |    **24.865 ns** |    **13.005 ns** | **0.0296** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Small_Names_64** |  **44,614.44 ns** | **1,148.085 ns** |   **600.471 ns** | **0.8865** |     **-** |     **-** |  **34,074 B** |
| **GetCurrentValues** |      **Small_Names_8** |   **5,823.03 ns** |   **224.042 ns** |   **117.179 ns** | **0.1149** |     **-** |     **-** |   **4,952 B** |
| **GetCurrentValues** |    **Small_Numbers_1** |     **806.74 ns** |    **16.039 ns** |     **8.389 ns** | **0.0161** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Small_Numbers_2** |   **1,482.12 ns** |   **105.649 ns** |    **55.256 ns** | **0.0294** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Small_Numbers_64** |  **43,907.53 ns** |   **809.174 ns** |   **423.213 ns** | **0.8741** |     **-** |     **-** |  **34,074 B** |
| **GetCurrentValues** |    **Small_Numbers_8** |   **5,786.92 ns** |   **108.617 ns** |    **56.809 ns** | **0.1154** |     **-** |     **-** |   **4,952 B** |
| **GetCurrentValues** |      **Small_Typed_1** |     **294.19 ns** |     **8.593 ns** |     **4.494 ns** | **0.0120** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Small_Typed_2** |     **590.77 ns** |    **17.961 ns** |     **9.394 ns** | **0.0239** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Small_Typed_64** |  **15,507.42 ns** |   **159.880 ns** |    **83.620 ns** | **0.4618** |     **-** |     **-** |  **19,233 B** |
| **GetCurrentValues** |      **Small_Typed_8** |   **2,130.51 ns** |    **67.696 ns** |    **35.406 ns** | **0.0641** |     **-** |     **-** |   **3,104 B** |
| **GetCurrentValues** |   **Small_Unknown_64** |  **41,493.01 ns** |   **910.827 ns** |   **476.380 ns** | **0.8170** |     **-** |     **-** |  **35,538 B** |
| **GetCurrentValues** |    **String_Typed_64** |   **1,963.01 ns** |    **68.382 ns** |    **35.765 ns** | **0.0762** |     **-** |     **-** |   **3,424 B** |
