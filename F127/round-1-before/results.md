``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|   Method | Length | IgnoreCase |            Case |       Mean |     Error |    StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------- |------- |----------- |---------------- |-----------:|----------:|----------:|------:|------:|------:|----------:|
| **Evaluate** |      **8** |      **False** | **DifferentLength** |   **4.636 ns** | **0.4189 ns** | **0.2191 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |      **False** |           **Equal** |   **5.426 ns** | **0.4502 ns** | **0.2354 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |      **False** |   **FirstMismatch** |   **4.594 ns** | **0.0763 ns** | **0.0399 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |      **False** |    **LastMismatch** |   **6.067 ns** | **0.2594 ns** | **0.1357 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |       **True** | **DifferentLength** |  **13.231 ns** | **0.1099 ns** | **0.0575 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |       **True** |           **Equal** |  **13.967 ns** | **0.3757 ns** | **0.1965 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |       **True** |   **FirstMismatch** |   **6.451 ns** | **0.1168 ns** | **0.0611 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |      **8** |       **True** |    **LastMismatch** |  **14.247 ns** | **0.7274 ns** | **0.3804 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |      **False** | **DifferentLength** |   **9.038 ns** | **0.3979 ns** | **0.2081 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |      **False** |           **Equal** |   **9.501 ns** | **0.3344 ns** | **0.1749 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |      **False** |   **FirstMismatch** |   **4.542 ns** | **0.0339 ns** | **0.0177 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |      **False** |    **LastMismatch** |  **10.471 ns** | **0.2775 ns** | **0.1451 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |       **True** | **DifferentLength** |  **65.561 ns** | **1.3528 ns** | **0.7075 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |       **True** |           **Equal** |  **65.783 ns** | **0.7151 ns** | **0.3740 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |       **True** |   **FirstMismatch** |   **6.417 ns** | **0.1079 ns** | **0.0565 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |     **64** |       **True** |    **LastMismatch** |  **65.103 ns** | **0.7285 ns** | **0.3810 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |      **False** | **DifferentLength** |  **17.735 ns** | **0.6747 ns** | **0.3529 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |      **False** |           **Equal** |  **18.183 ns** | **0.4820 ns** | **0.2521 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |      **False** |   **FirstMismatch** |   **4.487 ns** | **0.0626 ns** | **0.0327 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |      **False** |    **LastMismatch** |  **19.532 ns** | **0.2477 ns** | **0.1296 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |       **True** | **DifferentLength** | **266.546 ns** | **2.3433 ns** | **1.2256 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |       **True** |           **Equal** | **267.745 ns** | **1.7574 ns** | **0.9192 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |       **True** |   **FirstMismatch** |   **6.464 ns** | **0.1108 ns** | **0.0579 ns** |     **-** |     **-** |     **-** |         **-** |
| **Evaluate** |    **256** |       **True** |    **LastMismatch** | **266.865 ns** | **2.5520 ns** | **1.3348 ns** |     **-** |     **-** |     **-** |         **-** |
