``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|              Method |      Profile |         Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------------- |------------- |-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
|        **PreparedSync** |      **Cached1** |    **171.78 ns** |     **4.000 ns** |     **2.092 ns** |      **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached1 |    180.42 ns |     2.128 ns |     1.113 ns |      - |     - |     - |      56 B |
|          PublicSync |      Cached1 | 76,945.53 ns | 4,306.731 ns | 2,252.504 ns |      - |     - |     - |   9,812 B |
|        **PreparedSync** |      **Cached8** |    **175.98 ns** |     **2.953 ns** |     **1.545 ns** |      **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached8 |    183.20 ns |     3.524 ns |     1.843 ns |      - |     - |     - |      56 B |
|          PublicSync |      Cached8 | 28,481.92 ns | 1,940.026 ns | 1,014.671 ns |      - |     - |     - |   9,496 B |
|        **PreparedSync** |          **Eof** |     **30.06 ns** |     **0.899 ns** |     **0.470 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedMemoryAsync |          Eof |     30.23 ns |     0.549 ns |     0.287 ns |      - |     - |     - |         - |
|          PublicSync |          Eof | 29,470.29 ns | 2,165.661 ns | 1,132.683 ns |      - |     - |     - |   9,444 B |
|        **PreparedSync** |    **Partial16** |    **194.73 ns** |     **7.211 ns** |     **3.771 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |    Partial16 |    178.00 ns |    17.136 ns |     8.962 ns |      - |     - |     - |      56 B |
|          PublicSync |    Partial16 | 28,568.91 ns | 1,235.328 ns |   646.100 ns |      - |     - |     - |   9,590 B |
|        **PreparedSync** |   **Uncached16** |    **186.61 ns** |     **8.090 ns** |     **4.231 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |   Uncached16 |    175.30 ns |     4.997 ns |     2.614 ns |      - |     - |     - |      56 B |
|          PublicSync |   Uncached16 | 29,392.18 ns | 2,866.185 ns | 1,499.070 ns |      - |     - |     - |   9,587 B |
|        **PreparedSync** |  **Uncached256** |    **190.61 ns** |     **3.137 ns** |     **1.641 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |  Uncached256 |    177.89 ns |     6.859 ns |     3.587 ns |      - |     - |     - |      56 B |
|          PublicSync |  Uncached256 | 29,751.45 ns | 2,456.591 ns | 1,284.845 ns |      - |     - |     - |   9,589 B |
|        **PreparedSync** | **Uncached4096** |    **254.23 ns** |     **7.193 ns** |     **3.762 ns** | **0.0026** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync | Uncached4096 |    232.59 ns |    11.325 ns |     5.923 ns |      - |     - |     - |      56 B |
|          PublicSync | Uncached4096 | 31,557.83 ns | 1,998.810 ns | 1,045.416 ns |      - |     - |     - |   9,583 B |
|        **PreparedSync** |    **Uncached9** |    **185.54 ns** |     **4.542 ns** |     **2.376 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |    Uncached9 |    173.22 ns |     4.465 ns |     2.336 ns |      - |     - |     - |      56 B |
|          PublicSync |    Uncached9 | 29,177.29 ns | 2,421.928 ns | 1,266.715 ns |      - |     - |     - |   9,585 B |
