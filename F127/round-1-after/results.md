``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|   Method | Length | IgnoreCase |            Case |      Mean |     Error |    StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------- |------- |----------- |---------------- |----------:|----------:|----------:|------:|------:|------:|----------:|
| **Evaluate** |      **8** |      **False** | **DifferentLength** |  **4.028 ns** | **0.0993 ns** | **0.0519 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |      **False** |           **Equal** |  **7.524 ns** | **0.0602 ns** | **0.0315 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |      **False** |   **FirstMismatch** |  **6.911 ns** | **0.1157 ns** | **0.0605 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |      **False** |    **LastMismatch** |  **6.834 ns** | **0.0806 ns** | **0.0422 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |       **True** | **DifferentLength** |  **5.436 ns** | **0.1791 ns** | **0.0937 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |       **True** |           **Equal** |  **8.597 ns** | **0.3096 ns** | **0.1619 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |       **True** |   **FirstMismatch** |  **7.519 ns** | **0.4587 ns** | **0.2399 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |       **True** |    **LastMismatch** |  **7.765 ns** | **0.0662 ns** | **0.0346 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |      **False** | **DifferentLength** |  **4.051 ns** | **0.0947 ns** | **0.0495 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |      **False** |           **Equal** |  **8.074 ns** | **0.0933 ns** | **0.0488 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |      **False** |   **FirstMismatch** |  **7.137 ns** | **0.2223 ns** | **0.1163 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |      **False** |    **LastMismatch** |  **7.187 ns** | **0.1051 ns** | **0.0550 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |       **True** | **DifferentLength** |  **5.339 ns** | **0.2037 ns** | **0.1066 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |       **True** |           **Equal** | **10.532 ns** | **0.2187 ns** | **0.1144 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |       **True** |   **FirstMismatch** |  **8.095 ns** | **0.1264 ns** | **0.0661 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |       **True** |    **LastMismatch** |  **9.580 ns** | **0.1221 ns** | **0.0638 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |      **False** | **DifferentLength** |  **4.122 ns** | **0.1591 ns** | **0.0832 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |      **False** |           **Equal** | **12.599 ns** | **0.1406 ns** | **0.0735 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |      **False** |   **FirstMismatch** |  **7.113 ns** | **0.0652 ns** | **0.0341 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |      **False** |    **LastMismatch** | **11.727 ns** | **0.1672 ns** | **0.0875 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |       **True** | **DifferentLength** |  **5.363 ns** | **0.1328 ns** | **0.0695 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |       **True** |           **Equal** | **20.971 ns** | **0.5090 ns** | **0.2662 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |       **True** |   **FirstMismatch** |  **8.045 ns** | **0.0647 ns** | **0.0338 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |       **True** |    **LastMismatch** | **20.560 ns** | **0.3627 ns** | **0.1897 ns** |     **-** |     **-** |     **-** |         **-** |
