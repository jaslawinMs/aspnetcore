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
| **Enumerate** |         **1** |  **False** |     **30.61 ns** |   **1.681 ns** |   **0.879 ns** | **0.0023** |     **-** |     **-** |      **96 B** |
| **Enumerate** |         **1** |   **True** |     **48.38 ns** |   **5.114 ns** |   **2.675 ns** | **0.0024** |     **-** |     **-** |      **96 B** |
| **Enumerate** |        **10** |  **False** |     **64.81 ns** |   **2.962 ns** |   **1.549 ns** | **0.0020** |     **-** |     **-** |      **96 B** |
| **Enumerate** |        **10** |   **True** |    **238.64 ns** |  **17.715 ns** |   **9.265 ns** | **0.0070** |     **-** |     **-** |     **336 B** |
| **Enumerate** |       **100** |  **False** |    **439.79 ns** |  **11.871 ns** |   **6.209 ns** |      **-** |     **-** |     **-** |      **96 B** |
| **Enumerate** |       **100** |   **True** |  **1,792.06 ns** | **151.553 ns** |  **79.265 ns** | **0.0518** |     **-** |     **-** |   **2,200 B** |
| **Enumerate** |      **1000** |  **False** |  **4,080.41 ns** | **152.201 ns** |  **79.604 ns** |      **-** |     **-** |     **-** |      **96 B** |
| **Enumerate** |      **1000** |   **True** | **15,976.23 ns** | **277.202 ns** | **144.982 ns** | **0.3189** |     **-** |     **-** |  **16,608 B** |
