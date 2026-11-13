``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|    Method | ItemCount | Nested |          Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------- |---------- |------- |--------------:|-------------:|-------------:|-------:|------:|------:|----------:|
| **Enumerate** |         **1** |  **False** |      **28.72 ns** |     **2.963 ns** |     **1.550 ns** | **0.0021** |     **-** |     **-** |      **88 B** |
| **Enumerate** |         **1** |   **True** |      **53.90 ns** |     **2.183 ns** |     **1.142 ns** | **0.0022** |     **-** |     **-** |      **88 B** |
| **Enumerate** |        **10** |  **False** |      **61.49 ns** |     **1.118 ns** |     **0.585 ns** | **0.0019** |     **-** |     **-** |      **88 B** |
| **Enumerate** |        **10** |   **True** |     **278.44 ns** |     **6.608 ns** |     **3.456 ns** | **0.0083** |     **-** |     **-** |     **328 B** |
| **Enumerate** |       **100** |  **False** |     **423.53 ns** |     **5.639 ns** |     **2.949 ns** |      **-** |     **-** |     **-** |      **88 B** |
| **Enumerate** |       **100** |   **True** |   **2,839.16 ns** |    **36.215 ns** |    **18.941 ns** | **0.0560** |     **-** |     **-** |   **2,192 B** |
| **Enumerate** |      **1000** |  **False** |   **3,975.98 ns** |   **108.540 ns** |    **56.769 ns** |      **-** |     **-** |     **-** |      **88 B** |
| **Enumerate** |      **1000** |   **True** | **110,332.95 ns** | **2,818.168 ns** | **1,473.956 ns** |      **-** |     **-** |     **-** |  **16,604 B** |
