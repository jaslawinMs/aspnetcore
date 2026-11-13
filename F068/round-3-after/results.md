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
| **Enumerate** |         **1** |  **False** |     **30.20 ns** |   **2.086 ns** |   **1.091 ns** | **0.0023** |     **-** |     **-** |      **96 B** |
| **Enumerate** |         **1** |   **True** |     **47.20 ns** |   **4.030 ns** |   **2.108 ns** | **0.0024** |     **-** |     **-** |      **96 B** |
| **Enumerate** |        **10** |  **False** |     **64.52 ns** |   **5.348 ns** |   **2.797 ns** | **0.0026** |     **-** |     **-** |      **96 B** |
| **Enumerate** |        **10** |   **True** |    **222.16 ns** |   **4.541 ns** |   **2.375 ns** | **0.0089** |     **-** |     **-** |     **336 B** |
| **Enumerate** |       **100** |  **False** |    **431.83 ns** |   **8.651 ns** |   **4.525 ns** |      **-** |     **-** |     **-** |      **96 B** |
| **Enumerate** |       **100** |   **True** |  **1,733.04 ns** |  **82.028 ns** |  **42.902 ns** | **0.0510** |     **-** |     **-** |   **2,200 B** |
| **Enumerate** |      **1000** |  **False** |  **4,032.58 ns** |  **53.591 ns** |  **28.029 ns** |      **-** |     **-** |     **-** |      **96 B** |
| **Enumerate** |      **1000** |   **True** | **16,026.31 ns** | **663.575 ns** | **347.063 ns** | **0.3205** |     **-** |     **-** |  **16,609 B** |
