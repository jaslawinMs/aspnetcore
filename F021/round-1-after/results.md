``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|           Method |         Case |         Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |------------- |-------------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **GetCurrentValues** |      **Alias_1** |    **359.08 ns** |  **29.302 ns** |  **15.325 ns** | **0.0139** |     **-** |     **-** |     **528 B** |
| **GetCurrentValues** |     **Alias_64** | **13,889.60 ns** | **193.178 ns** | **101.036 ns** | **0.4261** |     **-** |     **-** |  **18,641 B** |
| **GetCurrentValues** |      **Alias_8** |  **1,846.61 ns** |  **52.963 ns** |  **27.701 ns** | **0.0566** |     **-** |     **-** |   **2,512 B** |
| **GetCurrentValues** |   **Combined_1** |    **337.60 ns** |  **22.742 ns** |  **11.895 ns** | **0.0132** |     **-** |     **-** |     **528 B** |
| **GetCurrentValues** |  **Combined_64** | **13,377.82 ns** | **400.228 ns** | **209.327 ns** | **0.3964** |     **-** |     **-** |  **18,640 B** |
| **GetCurrentValues** |   **Combined_8** |  **1,797.92 ns** |  **51.365 ns** |  **26.865 ns** | **0.0530** |     **-** |     **-** |   **2,512 B** |
| **GetCurrentValues** |      **Empty_1** |     **88.71 ns** |   **5.486 ns** |   **2.869 ns** | **0.0062** |     **-** |     **-** |     **240 B** |
| **GetCurrentValues** |    **Invalid_1** |    **167.46 ns** |   **3.638 ns** |   **1.903 ns** | **0.0051** |     **-** |     **-** |     **240 B** |
| **GetCurrentValues** |   **Invalid_64** |  **2,555.30 ns** |  **83.574 ns** |  **43.711 ns** |      **-** |     **-** |     **-** |     **208 B** |
| **GetCurrentValues** |    **Invalid_8** |    **390.83 ns** |   **8.532 ns** |   **4.462 ns** | **0.0039** |     **-** |     **-** |     **208 B** |
| **GetCurrentValues** |  **Lowercase_1** |    **172.62 ns** |   **7.382 ns** |   **3.861 ns** | **0.0052** |     **-** |     **-** |     **240 B** |
| **GetCurrentValues** | **Lowercase_64** |  **2,729.76 ns** |  **29.563 ns** |  **15.462 ns** |      **-** |     **-** |     **-** |     **208 B** |
| **GetCurrentValues** |  **Lowercase_8** |    **411.78 ns** |   **5.965 ns** |   **3.120 ns** | **0.0041** |     **-** |     **-** |     **208 B** |
| **GetCurrentValues** |      **Names_1** |    **336.11 ns** |   **7.959 ns** |   **4.163 ns** | **0.0127** |     **-** |     **-** |     **528 B** |
| **GetCurrentValues** |     **Names_64** | **13,427.69 ns** | **223.810 ns** | **117.057 ns** | **0.3890** |     **-** |     **-** |  **18,833 B** |
| **GetCurrentValues** |      **Names_8** |  **1,818.72 ns** |  **43.158 ns** |  **22.573 ns** | **0.0565** |     **-** |     **-** |   **2,704 B** |
| **GetCurrentValues** |    **Numbers_1** |    **324.50 ns** |  **10.051 ns** |   **5.257 ns** | **0.0130** |     **-** |     **-** |     **528 B** |
| **GetCurrentValues** |   **Numbers_64** | **13,424.52 ns** | **145.530 ns** |  **76.115 ns** | **0.3981** |     **-** |     **-** |  **18,833 B** |
| **GetCurrentValues** |    **Numbers_8** |  **1,853.21 ns** |  **50.366 ns** |  **26.342 ns** | **0.0561** |     **-** |     **-** |   **2,704 B** |
| **GetCurrentValues** |     **String_1** |    **102.67 ns** |   **3.520 ns** |   **1.841 ns** | **0.0052** |     **-** |     **-** |     **216 B** |
| **GetCurrentValues** |    **String_64** |  **1,384.75 ns** |  **16.934 ns** |   **8.857 ns** |      **-** |     **-** |     **-** |     **216 B** |
| **GetCurrentValues** |      **Typed_1** |    **258.69 ns** |  **23.983 ns** |  **12.543 ns** | **0.0129** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |     **Typed_64** | **13,167.19 ns** | **989.324 ns** | **517.435 ns** | **0.5061** |     **-** |     **-** |  **18,841 B** |
