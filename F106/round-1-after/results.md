``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|           Method |               Case |         Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |------------------- |-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
| **GetCurrentValues** |     **Alias_Names_16** |  **8,138.35 ns** |   **150.193 ns** |    **78.554 ns** | **0.0822** |     **-** |     **-** |   **5,608 B** |
| **GetCurrentValues** |   **Alias_Numbers_16** |  **8,361.38 ns** |   **113.782 ns** |    **59.510 ns** | **0.0840** |     **-** |     **-** |   **5,608 B** |
| **GetCurrentValues** |     **Alias_Typed_16** |  **1,627.36 ns** |    **44.082 ns** |    **23.056 ns** | **0.0477** |     **-** |     **-** |   **1,904 B** |
| **GetCurrentValues** |  **Flags_Combined_16** |  **8,715.59 ns** |   **157.612 ns** |    **82.434 ns** | **0.0868** |     **-** |     **-** |   **5,232 B** |
| **GetCurrentValues** |   **Large_Invalid_64** | **31,085.97 ns** |   **549.840 ns** |   **287.577 ns** | **0.3205** |     **-** |     **-** |  **15,056 B** |
| **GetCurrentValues** |  **Large_Iterator_64** | **64,939.65 ns** | **1,422.188 ns** |   **743.832 ns** |      **-** |     **-** |     **-** |  **25,822 B** |
| **GetCurrentValues** | **Large_Lowercase_64** | **41,353.35 ns** |   **990.754 ns** |   **518.183 ns** | **0.4085** |     **-** |     **-** |  **18,266 B** |
| **GetCurrentValues** |     **Large_Mixed_64** | **34,771.99 ns** |   **771.317 ns** |   **403.414 ns** | **0.3453** |     **-** |     **-** |  **22,178 B** |
| **GetCurrentValues** |      **Large_Names_1** |  **1,520.86 ns** |    **17.363 ns** |     **9.081 ns** | **0.0152** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Large_Names_2** |  **2,967.45 ns** |    **41.047 ns** |    **21.468 ns** | **0.0295** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Large_Names_64** | **44,114.94 ns** |   **793.082 ns** |   **414.797 ns** | **0.8803** |     **-** |     **-** |  **34,418 B** |
| **GetCurrentValues** |      **Large_Names_8** | **11,679.32 ns** |   **121.152 ns** |    **63.365 ns** | **0.1166** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |    **Large_Numbers_1** |  **1,542.80 ns** |    **23.928 ns** |    **12.515 ns** | **0.0153** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Large_Numbers_2** |  **2,946.89 ns** |    **31.564 ns** |    **16.509 ns** | **0.0296** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Large_Numbers_64** | **40,086.38 ns** |   **640.376 ns** |   **334.929 ns** | **0.7962** |     **-** |     **-** |  **34,418 B** |
| **GetCurrentValues** |    **Large_Numbers_8** | **11,595.32 ns** |   **645.784 ns** |   **337.758 ns** | **0.1141** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |  **Large_TwoValid_64** | **35,066.74 ns** |   **960.555 ns** |   **502.389 ns** | **0.3511** |     **-** |     **-** |  **22,450 B** |
| **GetCurrentValues** |      **Large_Typed_1** |    **997.35 ns** |    **12.426 ns** |     **6.499 ns** | **0.0101** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Large_Typed_2** |  **2,002.42 ns** |    **21.082 ns** |    **11.026 ns** | **0.0200** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Large_Typed_64** | **10,912.65 ns** |   **563.305 ns** |   **294.620 ns** | **0.5252** |     **-** |     **-** |  **19,577 B** |
| **GetCurrentValues** |      **Large_Typed_8** |  **7,728.90 ns** |    **80.203 ns** |    **41.947 ns** | **0.0769** |     **-** |     **-** |   **3,104 B** |
| **GetCurrentValues** |   **Large_Unknown_64** | **37,050.21 ns** | **1,982.084 ns** | **1,036.668 ns** | **0.3655** |     **-** |     **-** |  **27,218 B** |
| **GetCurrentValues** |      **Small_Empty_0** |     **52.32 ns** |     **1.639 ns** |     **0.857 ns** | **0.0017** |     **-** |     **-** |      **64 B** |
| **GetCurrentValues** |   **Small_Invalid_64** | **28,725.70 ns** | **2,050.396 ns** | **1,072.397 ns** | **0.2815** |     **-** |     **-** |  **15,058 B** |
| **GetCurrentValues** |  **Small_Iterator_64** | **16,609.41 ns** | **1,254.965 ns** |   **656.371 ns** | **0.4921** |     **-** |     **-** |  **19,193 B** |
| **GetCurrentValues** | **Small_Lowercase_64** | **29,962.18 ns** |   **651.623 ns** |   **340.811 ns** | **0.2990** |     **-** |     **-** |  **15,642 B** |
| **GetCurrentValues** |     **Small_Mixed_64** | **28,938.44 ns** |   **272.929 ns** |   **142.747 ns** | **0.2854** |     **-** |     **-** |  **16,194 B** |
| **GetCurrentValues** |      **Small_Names_1** |    **826.85 ns** |    **16.392 ns** |     **8.573 ns** | **0.0167** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Small_Names_2** |  **1,527.15 ns** |    **19.330 ns** |    **10.110 ns** | **0.0308** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Small_Names_64** | **34,024.01 ns** | **1,423.998 ns** |   **744.779 ns** | **0.3360** |     **-** |     **-** |  **21,818 B** |
| **GetCurrentValues** |      **Small_Names_8** |  **4,937.56 ns** |    **91.788 ns** |    **48.007 ns** | **0.0982** |     **-** |     **-** |   **4,344 B** |
| **GetCurrentValues** |    **Small_Numbers_1** |    **831.13 ns** |    **10.522 ns** |     **5.503 ns** | **0.0165** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Small_Numbers_2** |  **1,504.91 ns** |    **29.982 ns** |    **15.681 ns** | **0.0302** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Small_Numbers_64** | **33,943.39 ns** |   **678.607 ns** |   **354.924 ns** | **0.3324** |     **-** |     **-** |  **21,818 B** |
| **GetCurrentValues** |    **Small_Numbers_8** |  **4,960.05 ns** |    **83.338 ns** |    **43.587 ns** | **0.1009** |     **-** |     **-** |   **4,344 B** |
| **GetCurrentValues** |      **Small_Typed_1** |    **315.59 ns** |     **4.110 ns** |     **2.149 ns** | **0.0127** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Small_Typed_2** |    **628.75 ns** |    **15.088 ns** |     **7.891 ns** | **0.0252** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Small_Typed_64** |  **5,964.22 ns** |   **261.676 ns** |   **136.862 ns** | **0.1779** |     **-** |     **-** |   **6,976 B** |
| **GetCurrentValues** |      **Small_Typed_8** |  **1,291.32 ns** |    **59.584 ns** |    **31.164 ns** | **0.0636** |     **-** |     **-** |   **2,496 B** |
| **GetCurrentValues** |   **Small_Unknown_64** | **31,938.54 ns** |   **414.191 ns** |   **216.630 ns** | **0.3415** |     **-** |     **-** |  **21,234 B** |
| **GetCurrentValues** |    **String_Typed_64** |  **1,930.51 ns** |    **66.189 ns** |    **34.618 ns** | **0.0763** |     **-** |     **-** |   **3,424 B** |
