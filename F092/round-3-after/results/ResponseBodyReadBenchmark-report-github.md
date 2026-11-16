``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|              Method |      Profile |         Mean |        Error |       StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------------- |------------- |-------------:|-------------:|-------------:|------:|------:|------:|----------:|
|        **PreparedSync** |      **Cached1** |    **233.83 ns** |   **150.517 ns** |    **78.723 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached1 |    173.60 ns |     1.960 ns |     1.025 ns |     - |     - |     - |      56 B |
|          PublicSync |      Cached1 | 82,951.52 ns | 7,603.211 ns | 3,976.626 ns |     - |     - |     - |   9,835 B |
|        **PreparedSync** |      **Cached8** |    **174.89 ns** |     **2.048 ns** |     **1.071 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached8 |    171.25 ns |     1.823 ns |     0.953 ns |     - |     - |     - |      56 B |
|          PublicSync |      Cached8 | 29,075.94 ns | 2,501.768 ns | 1,308.473 ns |     - |     - |     - |   9,503 B |
|        **PreparedSync** |          **Eof** |     **30.63 ns** |     **0.081 ns** |     **0.043 ns** |     **-** |     **-** |     **-** |         **-** |
| PreparedMemoryAsync |          Eof |     31.19 ns |     0.475 ns |     0.248 ns |     - |     - |     - |         - |
|          PublicSync |          Eof | 27,814.09 ns | 1,554.318 ns |   812.938 ns |     - |     - |     - |   9,453 B |
|        **PreparedSync** |    **Partial16** |    **172.73 ns** |     **2.268 ns** |     **1.186 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |    Partial16 |    177.54 ns |     5.148 ns |     2.693 ns |     - |     - |     - |      56 B |
|          PublicSync |    Partial16 | 28,354.77 ns |   774.505 ns |   405.081 ns |     - |     - |     - |   9,534 B |
|        **PreparedSync** |   **Uncached16** |    **173.03 ns** |     **2.207 ns** |     **1.154 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |   Uncached16 |    173.97 ns |     2.242 ns |     1.173 ns |     - |     - |     - |      56 B |
|          PublicSync |   Uncached16 | 28,711.26 ns | 1,275.668 ns |   667.199 ns |     - |     - |     - |   9,537 B |
|        **PreparedSync** |  **Uncached256** |    **174.82 ns** |     **1.613 ns** |     **0.844 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |  Uncached256 |    175.95 ns |     1.029 ns |     0.538 ns |     - |     - |     - |      56 B |
|          PublicSync |  Uncached256 | 28,192.30 ns |   742.627 ns |   388.408 ns |     - |     - |     - |   9,532 B |
|        **PreparedSync** | **Uncached4096** |    **304.31 ns** |     **2.650 ns** |     **1.386 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync | Uncached4096 |    306.05 ns |     4.053 ns |     2.120 ns |     - |     - |     - |      56 B |
|          PublicSync | Uncached4096 | 30,913.88 ns | 1,232.671 ns |   644.711 ns |     - |     - |     - |   9,531 B |
|        **PreparedSync** |    **Uncached9** |    **174.07 ns** |     **3.519 ns** |     **1.840 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |    Uncached9 |    174.17 ns |     2.003 ns |     1.047 ns |     - |     - |     - |      56 B |
|          PublicSync |    Uncached9 | 28,539.90 ns | 1,036.233 ns |   541.970 ns |     - |     - |     - |   9,528 B |
