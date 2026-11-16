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
|        **PreparedSync** |      **Cached1** |    **174.63 ns** |     **7.301 ns** |     **3.818 ns** |      **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached1 |    172.51 ns |     7.850 ns |     4.106 ns |      - |     - |     - |      56 B |
|          PublicSync |      Cached1 | 83,039.93 ns | 7,786.717 ns | 4,072.604 ns |      - |     - |     - |   9,807 B |
|        **PreparedSync** |      **Cached8** |    **177.07 ns** |     **5.182 ns** |     **2.710 ns** |      **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached8 |    175.23 ns |     4.856 ns |     2.540 ns |      - |     - |     - |      56 B |
|          PublicSync |      Cached8 | 28,348.08 ns | 1,409.510 ns |   737.201 ns |      - |     - |     - |   9,504 B |
|        **PreparedSync** |          **Eof** |     **31.14 ns** |     **0.262 ns** |     **0.137 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedMemoryAsync |          Eof |     31.77 ns |     0.625 ns |     0.327 ns |      - |     - |     - |         - |
|          PublicSync |          Eof | 28,289.02 ns | 2,561.375 ns | 1,339.649 ns |      - |     - |     - |   9,446 B |
|        **PreparedSync** |    **Partial16** |    **188.11 ns** |     **2.289 ns** |     **1.197 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |    Partial16 |    175.20 ns |     4.371 ns |     2.286 ns |      - |     - |     - |      56 B |
|          PublicSync |    Partial16 | 28,365.63 ns | 1,286.350 ns |   672.786 ns |      - |     - |     - |   9,594 B |
|        **PreparedSync** |   **Uncached16** |    **186.05 ns** |     **7.663 ns** |     **4.008 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |   Uncached16 |    175.48 ns |     3.665 ns |     1.917 ns |      - |     - |     - |      56 B |
|          PublicSync |   Uncached16 | 28,550.21 ns | 1,620.042 ns |   847.313 ns |      - |     - |     - |   9,589 B |
|        **PreparedSync** |  **Uncached256** |    **188.34 ns** |     **4.725 ns** |     **2.471 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |  Uncached256 |    186.14 ns |     1.004 ns |     0.525 ns |      - |     - |     - |      56 B |
|          PublicSync |  Uncached256 | 28,424.12 ns |   953.880 ns |   498.898 ns |      - |     - |     - |   9,593 B |
|        **PreparedSync** | **Uncached4096** |    **243.52 ns** |     **3.509 ns** |     **1.835 ns** | **0.0025** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync | Uncached4096 |    233.24 ns |     2.640 ns |     1.381 ns |      - |     - |     - |      56 B |
|          PublicSync | Uncached4096 | 30,616.34 ns | 1,392.122 ns |   728.107 ns |      - |     - |     - |   9,588 B |
|        **PreparedSync** |    **Uncached9** |    **186.76 ns** |    **12.526 ns** |     **6.551 ns** | **0.0019** |     **-** |     **-** |     **128 B** |
| PreparedMemoryAsync |    Uncached9 |    176.33 ns |     1.627 ns |     0.851 ns |      - |     - |     - |      56 B |
|          PublicSync |    Uncached9 | 28,364.12 ns | 1,330.069 ns |   695.652 ns |      - |     - |     - |   9,587 B |
