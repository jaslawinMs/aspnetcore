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
| **GetCurrentValues** |     **Alias_Names_16** |   **9,560.97 ns** |   **235.992 ns** |   **123.428 ns** | **0.1923** |     **-** |     **-** |   **8,528 B** |
| **GetCurrentValues** |   **Alias_Numbers_16** |   **9,924.88 ns** |   **987.935 ns** |   **516.709 ns** | **0.1956** |     **-** |     **-** |   **8,529 B** |
| **GetCurrentValues** |     **Alias_Typed_16** |   **2,762.71 ns** |   **173.984 ns** |    **90.997 ns** | **0.1101** |     **-** |     **-** |   **4,824 B** |
| **GetCurrentValues** |  **Flags_Combined_16** |  **10,087.29 ns** |   **156.209 ns** |    **81.701 ns** | **0.2000** |     **-** |     **-** |   **8,529 B** |
| **GetCurrentValues** |   **Large_Invalid_64** |  **30,241.32 ns** |   **408.797 ns** |   **213.809 ns** | **0.3049** |     **-** |     **-** |  **15,056 B** |
| **GetCurrentValues** |  **Large_Iterator_64** |  **66,796.30 ns** |   **664.329 ns** |   **347.457 ns** | **0.6720** |     **-** |     **-** |  **25,812 B** |
| **GetCurrentValues** | **Large_Lowercase_64** |  **38,754.79 ns** | **1,046.349 ns** |   **547.261 ns** | **0.3858** |     **-** |     **-** |  **18,266 B** |
| **GetCurrentValues** |     **Large_Mixed_64** |  **31,423.50 ns** |   **299.771 ns** |   **156.786 ns** | **0.3157** |     **-** |     **-** |  **15,346 B** |
| **GetCurrentValues** |      **Large_Names_1** |   **1,508.32 ns** |    **17.002 ns** |     **8.892 ns** | **0.0150** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Large_Names_2** |   **2,920.53 ns** |    **38.288 ns** |    **20.025 ns** | **0.0291** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Large_Names_64** | **102,835.43 ns** | **2,592.027 ns** | **1,355.680 ns** | **1.0417** |     **-** |     **-** |  **40,693 B** |
| **GetCurrentValues** |      **Large_Names_8** |  **11,449.28 ns** |   **178.558 ns** |    **93.390 ns** | **0.1141** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |    **Large_Numbers_1** |   **1,516.19 ns** |    **16.670 ns** |     **8.719 ns** | **0.0152** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Large_Numbers_2** |   **2,922.78 ns** |   **127.266 ns** |    **66.562 ns** | **0.0290** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Large_Numbers_64** |  **96,395.00 ns** |   **744.916 ns** |   **389.605 ns** | **0.9615** |     **-** |     **-** |  **40,693 B** |
| **GetCurrentValues** |    **Large_Numbers_8** |  **11,250.73 ns** |   **129.807 ns** |    **67.891 ns** | **0.1126** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |  **Large_TwoValid_64** |  **32,066.98 ns** |   **409.913 ns** |   **214.393 ns** | **0.3205** |     **-** |     **-** |  **15,826 B** |
| **GetCurrentValues** |      **Large_Typed_1** |     **966.01 ns** |     **8.313 ns** |     **4.348 ns** | **0.0096** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Large_Typed_2** |   **1,949.65 ns** |    **39.174 ns** |    **20.489 ns** | **0.0193** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Large_Typed_64** |  **67,060.94 ns** |   **927.302 ns** |   **484.997 ns** | **0.6649** |     **-** |     **-** |  **25,852 B** |
| **GetCurrentValues** |      **Large_Typed_8** |   **7,600.64 ns** |   **577.677 ns** |   **302.136 ns** | **0.0751** |     **-** |     **-** |   **3,104 B** |
| **GetCurrentValues** |   **Large_Unknown_64** |  **84,646.89 ns** | **1,045.899 ns** |   **547.025 ns** | **0.8446** |     **-** |     **-** |  **35,540 B** |
| **GetCurrentValues** |      **Small_Empty_0** |      **39.28 ns** |     **1.501 ns** |     **0.785 ns** | **0.0014** |     **-** |     **-** |      **64 B** |
| **GetCurrentValues** |   **Small_Invalid_64** |  **28,213.16 ns** | **3,099.791 ns** | **1,621.250 ns** | **0.2778** |     **-** |     **-** |  **15,057 B** |
| **GetCurrentValues** |  **Small_Iterator_64** |  **15,340.22 ns** |   **336.928 ns** |   **176.220 ns** | **0.4507** |     **-** |     **-** |  **19,193 B** |
| **GetCurrentValues** | **Small_Lowercase_64** |  **29,240.36 ns** |   **199.311 ns** |   **104.243 ns** | **0.3125** |     **-** |     **-** |  **15,642 B** |
| **GetCurrentValues** |     **Small_Mixed_64** |  **27,836.43 ns** |   **255.624 ns** |   **133.697 ns** | **0.2790** |     **-** |     **-** |  **15,345 B** |
| **GetCurrentValues** |      **Small_Names_1** |     **782.41 ns** |    **17.862 ns** |     **9.342 ns** | **0.0156** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Small_Names_2** |   **1,430.92 ns** |    **39.394 ns** |    **20.604 ns** | **0.0283** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Small_Names_64** |  **43,987.08 ns** | **3,003.318 ns** | **1,570.793 ns** | **0.8562** |     **-** |     **-** |  **34,074 B** |
| **GetCurrentValues** |      **Small_Names_8** |   **5,746.89 ns** |   **266.943 ns** |   **139.616 ns** | **0.1133** |     **-** |     **-** |   **4,952 B** |
| **GetCurrentValues** |    **Small_Numbers_1** |     **786.85 ns** |    **14.395 ns** |     **7.529 ns** | **0.0155** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Small_Numbers_2** |   **1,450.77 ns** |    **30.943 ns** |    **16.184 ns** | **0.0291** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Small_Numbers_64** |  **43,202.49 ns** | **1,173.004 ns** |   **613.504 ns** | **0.8503** |     **-** |     **-** |  **34,074 B** |
| **GetCurrentValues** |    **Small_Numbers_8** |   **5,782.04 ns** |   **427.715 ns** |   **223.703 ns** | **0.1142** |     **-** |     **-** |   **4,952 B** |
| **GetCurrentValues** |      **Small_Typed_1** |     **286.12 ns** |    **20.077 ns** |    **10.501 ns** | **0.0115** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Small_Typed_2** |     **568.11 ns** |    **15.263 ns** |     **7.983 ns** | **0.0233** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Small_Typed_64** |  **15,547.77 ns** | **1,068.052 ns** |   **558.612 ns** | **0.4551** |     **-** |     **-** |  **19,233 B** |
| **GetCurrentValues** |      **Small_Typed_8** |   **2,084.06 ns** |   **100.607 ns** |    **52.620 ns** | **0.0630** |     **-** |     **-** |   **3,104 B** |
| **GetCurrentValues** |   **Small_Unknown_64** |  **40,341.99 ns** |   **718.500 ns** |   **375.790 ns** | **0.8065** |     **-** |     **-** |  **35,538 B** |
| **GetCurrentValues** |    **String_Typed_64** |   **1,893.58 ns** |    **67.457 ns** |    **35.281 ns** | **0.0751** |     **-** |     **-** |   **3,424 B** |
