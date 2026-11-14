``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|           Method |               Case |         Mean |        Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |------------------- |-------------:|-------------:|-----------:|-------:|------:|------:|----------:|
| **GetCurrentValues** |     **Alias_Names_16** |  **8,254.73 ns** |   **150.820 ns** |  **78.882 ns** | **0.0813** |     **-** |     **-** |   **5,608 B** |
| **GetCurrentValues** |   **Alias_Numbers_16** |  **8,240.36 ns** |   **158.732 ns** |  **83.020 ns** | **0.0822** |     **-** |     **-** |   **5,608 B** |
| **GetCurrentValues** |     **Alias_Typed_16** |  **1,594.60 ns** |    **31.188 ns** |  **16.312 ns** | **0.0467** |     **-** |     **-** |   **1,904 B** |
| **GetCurrentValues** |  **Flags_Combined_16** |  **8,600.93 ns** |   **201.066 ns** | **105.161 ns** | **0.0850** |     **-** |     **-** |   **5,232 B** |
| **GetCurrentValues** |   **Large_Invalid_64** | **32,427.91 ns** |   **390.438 ns** | **204.207 ns** | **0.3222** |     **-** |     **-** |  **15,057 B** |
| **GetCurrentValues** |  **Large_Iterator_64** | **64,999.28 ns** | **1,209.082 ns** | **632.373 ns** |      **-** |     **-** |     **-** |  **25,822 B** |
| **GetCurrentValues** | **Large_Lowercase_64** | **43,369.68 ns** |   **609.577 ns** | **318.821 ns** | **0.4281** |     **-** |     **-** |  **18,266 B** |
| **GetCurrentValues** |     **Large_Mixed_64** | **33,750.80 ns** |   **408.596 ns** | **213.703 ns** | **0.3360** |     **-** |     **-** |  **15,346 B** |
| **GetCurrentValues** |      **Large_Names_1** |  **1,529.51 ns** |    **27.863 ns** |  **14.573 ns** | **0.0153** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Large_Names_2** |  **2,958.75 ns** |    **69.912 ns** |  **36.565 ns** | **0.0294** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Large_Names_64** | **46,081.98 ns** |   **891.196 ns** | **466.113 ns** | **0.9124** |     **-** |     **-** |  **34,418 B** |
| **GetCurrentValues** |      **Large_Names_8** | **11,612.89 ns** |   **101.101 ns** |  **52.878 ns** | **0.1155** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |    **Large_Numbers_1** |  **1,564.70 ns** |    **43.397 ns** |  **22.698 ns** | **0.0154** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Large_Numbers_2** |  **3,029.57 ns** |   **269.136 ns** | **140.763 ns** | **0.0296** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Large_Numbers_64** | **40,289.59 ns** | **1,243.074 ns** | **650.152 ns** | **0.8065** |     **-** |     **-** |  **34,418 B** |
| **GetCurrentValues** |    **Large_Numbers_8** | **11,671.93 ns** |   **650.299 ns** | **340.119 ns** | **0.1160** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |  **Large_TwoValid_64** | **35,131.09 ns** | **1,130.118 ns** | **591.074 ns** | **0.3531** |     **-** |     **-** |  **15,826 B** |
| **GetCurrentValues** |      **Large_Typed_1** |  **1,009.26 ns** |    **14.955 ns** |   **7.822 ns** | **0.0101** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Large_Typed_2** |  **2,034.50 ns** |    **19.642 ns** |  **10.273 ns** | **0.0206** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Large_Typed_64** | **11,446.94 ns** |   **861.910 ns** | **450.796 ns** | **0.4537** |     **-** |     **-** |  **19,577 B** |
| **GetCurrentValues** |      **Large_Typed_8** |  **7,947.83 ns** |   **314.016 ns** | **164.237 ns** | **0.0784** |     **-** |     **-** |   **3,104 B** |
| **GetCurrentValues** |   **Large_Unknown_64** | **86,238.24 ns** | **1,555.461 ns** | **813.536 ns** | **0.8562** |     **-** |     **-** |  **35,541 B** |
| **GetCurrentValues** |      **Small_Empty_0** |     **41.48 ns** |     **0.861 ns** |   **0.450 ns** | **0.0017** |     **-** |     **-** |      **64 B** |
| **GetCurrentValues** |   **Small_Invalid_64** | **28,851.87 ns** |   **472.942 ns** | **247.358 ns** | **0.2854** |     **-** |     **-** |  **15,057 B** |
| **GetCurrentValues** |  **Small_Iterator_64** | **16,211.42 ns** | **1,026.110 ns** | **536.675 ns** | **0.4759** |     **-** |     **-** |  **19,193 B** |
| **GetCurrentValues** | **Small_Lowercase_64** | **30,442.70 ns** | **1,127.889 ns** | **589.908 ns** | **0.3034** |     **-** |     **-** |  **15,642 B** |
| **GetCurrentValues** |     **Small_Mixed_64** | **29,256.08 ns** |   **388.482 ns** | **203.183 ns** | **0.2880** |     **-** |     **-** |  **15,346 B** |
| **GetCurrentValues** |      **Small_Names_1** |    **840.29 ns** |    **16.241 ns** |   **8.494 ns** | **0.0168** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Small_Names_2** |  **1,538.76 ns** |    **30.880 ns** |  **16.151 ns** | **0.0306** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Small_Names_64** | **34,348.01 ns** |   **319.941 ns** | **167.335 ns** | **0.3415** |     **-** |     **-** |  **21,818 B** |
| **GetCurrentValues** |      **Small_Names_8** |  **5,116.93 ns** |   **367.855 ns** | **192.395 ns** | **0.1014** |     **-** |     **-** |   **4,344 B** |
| **GetCurrentValues** |    **Small_Numbers_1** |    **854.96 ns** |    **16.435 ns** |   **8.596 ns** | **0.0169** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Small_Numbers_2** |  **1,524.68 ns** |    **26.787 ns** |  **14.010 ns** | **0.0303** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Small_Numbers_64** | **34,261.94 ns** | **1,000.370 ns** | **523.213 ns** | **0.3634** |     **-** |     **-** |  **21,818 B** |
| **GetCurrentValues** |    **Small_Numbers_8** |  **5,075.85 ns** |   **187.927 ns** |  **98.289 ns** | **0.0986** |     **-** |     **-** |   **4,344 B** |
| **GetCurrentValues** |      **Small_Typed_1** |    **331.53 ns** |    **49.416 ns** |  **25.846 ns** | **0.0123** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Small_Typed_2** |    **631.09 ns** |    **64.648 ns** |  **33.812 ns** | **0.0253** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Small_Typed_64** |  **6,209.57 ns** |   **110.756 ns** |  **57.927 ns** | **0.1258** |     **-** |     **-** |   **6,976 B** |
| **GetCurrentValues** |      **Small_Typed_8** |  **1,333.54 ns** |    **28.462 ns** |  **14.886 ns** | **0.0541** |     **-** |     **-** |   **2,496 B** |
| **GetCurrentValues** |   **Small_Unknown_64** | **42,968.46 ns** |   **872.992 ns** | **456.592 ns** | **0.9058** |     **-** |     **-** |  **35,538 B** |
| **GetCurrentValues** |    **String_Typed_64** |  **1,953.15 ns** |    **59.737 ns** |  **31.243 ns** | **0.0766** |     **-** |     **-** |   **3,424 B** |
