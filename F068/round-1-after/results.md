``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|    Method | ItemCount | Nested |         Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------- |---------- |------- |-------------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **Enumerate** |         **1** |  **False** |     **31.18 ns** |   **1.130 ns** |   **0.591 ns** | **0.0023** |     **-** |     **-** |      **96 B** |
| **Enumerate** |         **1** |   **True** |     **47.22 ns** |   **3.623 ns** |   **1.895 ns** | **0.0025** |     **-** |     **-** |      **96 B** |
| **Enumerate** |        **10** |  **False** |     **64.96 ns** |   **4.788 ns** |   **2.504 ns** | **0.0020** |     **-** |     **-** |      **96 B** |
| **Enumerate** |        **10** |   **True** |    **233.58 ns** |   **7.288 ns** |   **3.812 ns** | **0.0070** |     **-** |     **-** |     **336 B** |
| **Enumerate** |       **100** |  **False** |    **449.45 ns** |  **41.018 ns** |  **21.453 ns** |      **-** |     **-** |     **-** |      **96 B** |
| **Enumerate** |       **100** |   **True** |  **1,764.95 ns** |  **22.409 ns** |  **11.720 ns** | **0.0536** |     **-** |     **-** |   **2,200 B** |
| **Enumerate** |      **1000** |  **False** |  **9,007.68 ns** | **471.566 ns** | **246.638 ns** |      **-** |     **-** |     **-** |      **96 B** |
| **Enumerate** |      **1000** |   **True** | **20,739.20 ns** | **955.624 ns** | **499.810 ns** | **0.4139** |     **-** |     **-** |  **16,609 B** |
