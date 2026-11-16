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
|        **PreparedSync** |      **Cached1** |    **174.16 ns** |     **3.136 ns** |     **1.640 ns** |      **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached1 |    175.98 ns |    17.025 ns |     8.905 ns |      - |     - |     - |      56 B |
|          PublicSync |      Cached1 | 83,113.91 ns | 7,704.331 ns | 4,029.514 ns |      - |     - |     - |   9,813 B |
|        **PreparedSync** |      **Cached8** |    **172.42 ns** |     **1.400 ns** |     **0.732 ns** |      **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached8 |    173.88 ns |     1.762 ns |     0.922 ns |      - |     - |     - |      56 B |
|          PublicSync |      Cached8 | 29,449.57 ns | 1,053.956 ns |   551.239 ns |      - |     - |     - |   9,503 B |
|        **PreparedSync** |          **Eof** |     **31.30 ns** |     **2.524 ns** |     **1.320 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedMemoryAsync |          Eof |     29.95 ns |     2.658 ns |     1.390 ns |      - |     - |     - |         - |
|          PublicSync |          Eof | 29,702.05 ns | 1,910.747 ns |   999.357 ns |      - |     - |     - |   9,445 B |
|        **PreparedSync** |    **Partial16** |    **184.90 ns** |     **2.372 ns** |     **1.241 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |    Partial16 |    171.48 ns |     2.119 ns |     1.108 ns |      - |     - |     - |      56 B |
|          PublicSync |    Partial16 | 30,130.21 ns | 1,701.731 ns |   890.038 ns |      - |     - |     - |   9,585 B |
|        **PreparedSync** |   **Uncached16** |    **190.70 ns** |     **3.567 ns** |     **1.866 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |   Uncached16 |    178.42 ns |    18.064 ns |     9.448 ns |      - |     - |     - |      56 B |
|          PublicSync |   Uncached16 | 29,879.07 ns | 1,947.040 ns | 1,018.339 ns |      - |     - |     - |   9,585 B |
|        **PreparedSync** |  **Uncached256** |    **194.19 ns** |    **10.547 ns** |     **5.516 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |  Uncached256 |    174.78 ns |     2.030 ns |     1.062 ns |      - |     - |     - |      56 B |
|          PublicSync |  Uncached256 | 29,761.27 ns | 1,711.729 ns |   895.267 ns |      - |     - |     - |   9,589 B |
|        **PreparedSync** | **Uncached4096** |    **253.65 ns** |     **3.100 ns** |     **1.621 ns** | **0.0026** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync | Uncached4096 |    249.20 ns |     1.971 ns |     1.031 ns |      - |     - |     - |      56 B |
|          PublicSync | Uncached4096 | 31,957.48 ns | 1,516.948 ns |   793.393 ns |      - |     - |     - |   9,586 B |
|        **PreparedSync** |    **Uncached9** |    **191.62 ns** |    **12.673 ns** |     **6.628 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |    Uncached9 |    172.75 ns |     1.495 ns |     0.782 ns |      - |     - |     - |      56 B |
|          PublicSync |    Uncached9 | 29,990.21 ns | 1,712.987 ns |   895.926 ns |      - |     - |     - |   9,591 B |
