``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|       Method |                 Case |        Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------- |--------------------- |------------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **FormatHeader** |    **Constructed_Empty** |    **17.84 ns** |   **0.797 ns** |   **0.417 ns** | **0.0009** |     **-** |     **-** |      **40 B** |
| **FormatHeader** |    **Constructed_Large** | **1,198.75 ns** | **114.509 ns** |  **59.890 ns** | **0.2147** |     **-** |     **-** |   **8,232 B** |
| **FormatHeader** | **Constructed_LongName** |    **44.52 ns** |   **9.734 ns** |   **5.091 ns** | **0.0049** |     **-** |     **-** |     **184 B** |
| **FormatHeader** |   **Constructed_Medium** |    **92.23 ns** |   **6.112 ns** |   **3.197 ns** | **0.0141** |     **-** |     **-** |     **552 B** |
| **FormatHeader** |   **Constructed_Quoted** |    **23.51 ns** |   **0.534 ns** |   **0.279 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **FormatHeader** |    **Constructed_Small** |    **23.97 ns** |   **0.920 ns** |   **0.481 ns** | **0.0019** |     **-** |     **-** |      **72 B** |
| **FormatHeader** |  **Constructed_Symbols** |    **27.48 ns** |   **1.418 ns** |   **0.741 ns** | **0.0025** |     **-** |     **-** |      **96 B** |
| **FormatHeader** |         **Parsed_Empty** |    **17.81 ns** |   **1.305 ns** |   **0.683 ns** | **0.0009** |     **-** |     **-** |      **40 B** |
| **FormatHeader** |         **Parsed_Large** | **1,202.59 ns** | **457.158 ns** | **239.102 ns** | **0.2095** |     **-** |     **-** |   **8,232 B** |
| **FormatHeader** |      **Parsed_LongName** |    **40.35 ns** |   **1.624 ns** |   **0.850 ns** | **0.0049** |     **-** |     **-** |     **184 B** |
| **FormatHeader** |        **Parsed_Medium** |    **90.63 ns** |  **10.328 ns** |   **5.402 ns** | **0.0147** |     **-** |     **-** |     **552 B** |
| **FormatHeader** |        **Parsed_Quoted** |    **23.63 ns** |   **0.983 ns** |   **0.514 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **FormatHeader** |         **Parsed_Small** |    **24.08 ns** |   **2.062 ns** |   **1.079 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **FormatHeader** |       **Parsed_Symbols** |    **27.03 ns** |   **1.019 ns** |   **0.533 ns** | **0.0025** |     **-** |     **-** |      **96 B** |
| **FormatHeader** |      **SetCookie_Empty** |    **25.69 ns** |   **0.546 ns** |   **0.286 ns** | **0.0009** |     **-** |     **-** |      **40 B** |
| **FormatHeader** |      **SetCookie_Large** | **1,174.90 ns** | **122.546 ns** |  **64.094 ns** | **0.2185** |     **-** |     **-** |   **8,232 B** |
| **FormatHeader** |      **SetCookie_Small** |    **32.23 ns** |   **1.628 ns** |   **0.852 ns** | **0.0018** |     **-** |     **-** |      **72 B** |
| **FormatHeader** |         **Sliced_Empty** |    **17.79 ns** |   **1.179 ns** |   **0.617 ns** | **0.0009** |     **-** |     **-** |      **40 B** |
| **FormatHeader** |         **Sliced_Large** | **1,147.02 ns** | **166.023 ns** |  **86.833 ns** | **0.2080** |     **-** |     **-** |   **8,232 B** |
| **FormatHeader** |      **Sliced_LongName** |    **48.31 ns** |  **13.415 ns** |   **7.016 ns** | **0.0048** |     **-** |     **-** |     **184 B** |
| **FormatHeader** |        **Sliced_Medium** |    **91.46 ns** |  **18.529 ns** |   **9.691 ns** | **0.0140** |     **-** |     **-** |     **552 B** |
| **FormatHeader** |        **Sliced_Quoted** |    **23.94 ns** |   **0.413 ns** |   **0.216 ns** | **0.0019** |     **-** |     **-** |      **72 B** |
| **FormatHeader** |         **Sliced_Small** |    **24.53 ns** |   **3.491 ns** |   **1.826 ns** | **0.0019** |     **-** |     **-** |      **72 B** |
| **FormatHeader** |       **Sliced_Symbols** |    **26.26 ns** |   **0.729 ns** |   **0.381 ns** | **0.0025** |     **-** |     **-** |      **96 B** |
