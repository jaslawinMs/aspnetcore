``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|           Method |         Case |         Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |------------- |-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
| **GetCurrentValues** |      **Alias_1** |    **808.05 ns** |    **11.930 ns** |     **6.240 ns** | **0.0160** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |     **Alias_64** | **39,548.54 ns** |   **604.878 ns** |   **316.363 ns** | **0.7813** |     **-** |     **-** |  **33,490 B** |
| **GetCurrentValues** |      **Alias_8** |  **5,185.85 ns** |    **74.530 ns** |    **38.980 ns** | **0.1035** |     **-** |     **-** |   **4,368 B** |
| **GetCurrentValues** |   **Combined_1** |    **791.53 ns** |    **11.046 ns** |     **5.777 ns** | **0.0159** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |  **Combined_64** | **39,767.75 ns** |   **613.064 ns** |   **320.644 ns** | **0.7911** |     **-** |     **-** |  **33,489 B** |
| **GetCurrentValues** |   **Combined_8** |  **5,254.30 ns** |   **244.760 ns** |   **128.014 ns** | **0.1026** |     **-** |     **-** |   **4,368 B** |
| **GetCurrentValues** |      **Empty_1** |     **87.04 ns** |     **2.882 ns** |     **1.507 ns** | **0.0061** |     **-** |     **-** |     **240 B** |
| **GetCurrentValues** |    **Invalid_1** |    **588.61 ns** |     **9.557 ns** |     **4.999 ns** | **0.0118** |     **-** |     **-** |     **472 B** |
| **GetCurrentValues** |   **Invalid_64** | **28,474.30 ns** |   **343.600 ns** |   **179.710 ns** | **0.2841** |     **-** |     **-** |  **15,058 B** |
| **GetCurrentValues** |    **Invalid_8** |  **3,671.67 ns** |    **33.962 ns** |    **17.763 ns** | **0.0369** |     **-** |     **-** |   **2,064 B** |
| **GetCurrentValues** |  **Lowercase_1** |    **591.82 ns** |     **6.757 ns** |     **3.534 ns** | **0.0118** |     **-** |     **-** |     **472 B** |
| **GetCurrentValues** | **Lowercase_64** | **30,048.40 ns** |   **514.475 ns** |   **269.080 ns** | **0.2990** |     **-** |     **-** |  **15,058 B** |
| **GetCurrentValues** |  **Lowercase_8** |  **3,786.52 ns** |    **53.427 ns** |    **27.943 ns** | **0.0378** |     **-** |     **-** |   **2,064 B** |
| **GetCurrentValues** |      **Names_1** |    **775.49 ns** |    **12.290 ns** |     **6.428 ns** | **0.0155** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |     **Names_64** | **39,890.47 ns** |   **458.066 ns** |   **239.577 ns** | **0.7962** |     **-** |     **-** |  **33,682 B** |
| **GetCurrentValues** |      **Names_8** |  **5,292.03 ns** |    **71.096 ns** |    **37.185 ns** | **0.1049** |     **-** |     **-** |   **4,560 B** |
| **GetCurrentValues** |    **Numbers_1** |    **775.54 ns** |    **16.270 ns** |     **8.510 ns** | **0.0155** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |   **Numbers_64** | **40,764.44 ns** | **1,984.378 ns** | **1,037.868 ns** | **0.8013** |     **-** |     **-** |  **33,682 B** |
| **GetCurrentValues** |    **Numbers_8** |  **5,365.35 ns** |   **110.283 ns** |    **57.680 ns** | **0.1073** |     **-** |     **-** |   **4,560 B** |
| **GetCurrentValues** |     **String_1** |     **99.08 ns** |     **4.139 ns** |     **2.165 ns** | **0.0051** |     **-** |     **-** |     **216 B** |
| **GetCurrentValues** |    **String_64** |  **1,389.72 ns** |    **14.596 ns** |     **7.634 ns** |      **-** |     **-** |     **-** |     **216 B** |
| **GetCurrentValues** |      **Typed_1** |    **255.38 ns** |     **5.115 ns** |     **2.675 ns** | **0.0126** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |     **Typed_64** | **12,537.08 ns** |   **147.213 ns** |    **76.995 ns** | **0.3834** |     **-** |     **-** |  **18,841 B** |
