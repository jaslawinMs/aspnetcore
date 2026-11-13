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
| **Enumerate** |         **1** |  **False** |      **29.33 ns** |     **3.761 ns** |     **1.967 ns** | **0.0022** |     **-** |     **-** |      **88 B** |
| **Enumerate** |         **1** |   **True** |      **55.80 ns** |     **3.636 ns** |     **1.902 ns** | **0.0023** |     **-** |     **-** |      **88 B** |
| **Enumerate** |        **10** |  **False** |      **62.20 ns** |     **2.390 ns** |     **1.250 ns** | **0.0019** |     **-** |     **-** |      **88 B** |
| **Enumerate** |        **10** |   **True** |     **281.16 ns** |     **9.650 ns** |     **5.047 ns** | **0.0084** |     **-** |     **-** |     **328 B** |
| **Enumerate** |       **100** |  **False** |     **430.14 ns** |    **12.866 ns** |     **6.729 ns** |      **-** |     **-** |     **-** |      **88 B** |
| **Enumerate** |       **100** |   **True** |   **2,863.52 ns** |    **70.855 ns** |    **37.059 ns** | **0.0567** |     **-** |     **-** |   **2,192 B** |
| **Enumerate** |      **1000** |  **False** |   **4,032.53 ns** |   **219.261 ns** |   **114.678 ns** |      **-** |     **-** |     **-** |      **88 B** |
| **Enumerate** |      **1000** |   **True** | **112,705.71 ns** | **2,235.071 ns** | **1,168.985 ns** |      **-** |     **-** |     **-** |  **16,605 B** |
