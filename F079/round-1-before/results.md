``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|       Method |                 Case |        Mean |        Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------- |--------------------- |------------:|-------------:|-----------:|-------:|------:|------:|----------:|
| **FormatHeader** |    **Constructed_Empty** |    **34.51 ns** |     **4.056 ns** |   **2.121 ns** | **0.0035** |     **-** |     **-** |     **144 B** |
| **FormatHeader** |    **Constructed_Large** | **2,824.92 ns** |   **503.351 ns** | **263.263 ns** | **0.4508** |     **-** |     **-** |  **16,584 B** |
| **FormatHeader** | **Constructed_LongName** |   **169.10 ns** |     **8.175 ns** |   **4.275 ns** | **0.0163** |     **-** |     **-** |     **656 B** |
| **FormatHeader** |   **Constructed_Medium** |   **215.94 ns** |    **29.162 ns** |  **15.252 ns** | **0.0317** |     **-** |     **-** |   **1,224 B** |
| **FormatHeader** |   **Constructed_Quoted** |    **74.06 ns** |     **4.539 ns** |   **2.374 ns** | **0.0068** |     **-** |     **-** |     **280 B** |
| **FormatHeader** |    **Constructed_Small** |    **69.36 ns** |     **3.593 ns** |   **1.879 ns** | **0.0069** |     **-** |     **-** |     **280 B** |
| **FormatHeader** |  **Constructed_Symbols** |    **80.13 ns** |     **1.892 ns** |   **0.989 ns** | **0.0077** |     **-** |     **-** |     **312 B** |
| **FormatHeader** |         **Parsed_Empty** |    **38.51 ns** |    **18.007 ns** |   **9.418 ns** | **0.0038** |     **-** |     **-** |     **144 B** |
| **FormatHeader** |         **Parsed_Large** | **3,237.94 ns** | **1,465.605 ns** | **766.540 ns** | **0.4625** |     **-** |     **-** |  **16,584 B** |
| **FormatHeader** |      **Parsed_LongName** |   **162.38 ns** |     **7.183 ns** |   **3.757 ns** | **0.0165** |     **-** |     **-** |     **656 B** |
| **FormatHeader** |        **Parsed_Medium** |   **213.75 ns** |    **25.026 ns** |  **13.089 ns** | **0.0304** |     **-** |     **-** |   **1,224 B** |
| **FormatHeader** |        **Parsed_Quoted** |    **74.60 ns** |     **6.056 ns** |   **3.167 ns** | **0.0070** |     **-** |     **-** |     **280 B** |
| **FormatHeader** |         **Parsed_Small** |    **71.13 ns** |     **4.534 ns** |   **2.371 ns** | **0.0069** |     **-** |     **-** |     **280 B** |
| **FormatHeader** |       **Parsed_Symbols** |    **81.31 ns** |     **6.474 ns** |   **3.386 ns** | **0.0079** |     **-** |     **-** |     **312 B** |
| **FormatHeader** |      **SetCookie_Empty** |    **25.08 ns** |     **2.748 ns** |   **1.437 ns** | **0.0008** |     **-** |     **-** |      **40 B** |
| **FormatHeader** |      **SetCookie_Large** | **1,115.63 ns** |   **234.638 ns** | **122.720 ns** | **0.2159** |     **-** |     **-** |   **8,232 B** |
| **FormatHeader** |      **SetCookie_Small** |    **29.95 ns** |     **0.954 ns** |   **0.499 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **FormatHeader** |         **Sliced_Empty** |    **33.69 ns** |     **1.348 ns** |   **0.705 ns** | **0.0037** |     **-** |     **-** |     **144 B** |
| **FormatHeader** |         **Sliced_Large** | **2,833.76 ns** |   **192.269 ns** | **100.560 ns** | **0.4446** |     **-** |     **-** |  **16,584 B** |
| **FormatHeader** |      **Sliced_LongName** |   **179.56 ns** |    **35.892 ns** |  **18.772 ns** | **0.0164** |     **-** |     **-** |     **656 B** |
| **FormatHeader** |        **Sliced_Medium** |   **220.45 ns** |    **49.337 ns** |  **25.804 ns** | **0.0308** |     **-** |     **-** |   **1,224 B** |
| **FormatHeader** |        **Sliced_Quoted** |    **74.98 ns** |     **6.989 ns** |   **3.655 ns** | **0.0074** |     **-** |     **-** |     **280 B** |
| **FormatHeader** |         **Sliced_Small** |    **71.49 ns** |     **6.144 ns** |   **3.214 ns** | **0.0068** |     **-** |     **-** |     **280 B** |
| **FormatHeader** |       **Sliced_Symbols** |    **79.32 ns** |     **4.854 ns** |   **2.539 ns** | **0.0081** |     **-** |     **-** |     **312 B** |
