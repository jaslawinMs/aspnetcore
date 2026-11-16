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
|        **PreparedSync** |      **Cached1** |    **172.85 ns** |     **3.646 ns** |     **1.907 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached1 |    175.38 ns |    17.090 ns |     8.938 ns |     - |     - |     - |      56 B |
|          PublicSync |      Cached1 | 85,860.21 ns | 6,337.093 ns | 3,314.422 ns |     - |     - |     - |   9,804 B |
|        **PreparedSync** |      **Cached8** |    **175.30 ns** |    **12.195 ns** |     **6.378 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached8 |    175.25 ns |     2.378 ns |     1.244 ns |     - |     - |     - |      56 B |
|          PublicSync |      Cached8 | 29,260.10 ns | 1,165.435 ns |   609.545 ns |     - |     - |     - |   9,499 B |
|        **PreparedSync** |          **Eof** |     **31.01 ns** |     **0.189 ns** |     **0.099 ns** |     **-** |     **-** |     **-** |         **-** |
| PreparedMemoryAsync |          Eof |     29.32 ns |     0.146 ns |     0.076 ns |     - |     - |     - |         - |
|          PublicSync |          Eof | 29,464.40 ns | 1,188.410 ns |   621.562 ns |     - |     - |     - |   9,452 B |
|        **PreparedSync** |    **Partial16** |    **177.09 ns** |    **10.563 ns** |     **5.525 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |    Partial16 |    172.09 ns |     1.758 ns |     0.920 ns |     - |     - |     - |      56 B |
|          PublicSync |    Partial16 | 29,960.47 ns | 1,220.810 ns |   638.507 ns |     - |     - |     - |   9,530 B |
|        **PreparedSync** |   **Uncached16** |    **174.85 ns** |    **13.234 ns** |     **6.922 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |   Uncached16 |    177.28 ns |     7.454 ns |     3.899 ns |     - |     - |     - |      56 B |
|          PublicSync |   Uncached16 | 29,950.60 ns | 1,236.922 ns |   646.934 ns |     - |     - |     - |   9,526 B |
|        **PreparedSync** |  **Uncached256** |    **181.35 ns** |    **18.804 ns** |     **9.835 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |  Uncached256 |    182.78 ns |    15.147 ns |     7.922 ns |     - |     - |     - |      56 B |
|          PublicSync |  Uncached256 | 30,307.16 ns | 1,391.050 ns |   727.546 ns |     - |     - |     - |   9,525 B |
|        **PreparedSync** | **Uncached4096** |    **233.48 ns** |     **2.411 ns** |     **1.261 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync | Uncached4096 |    241.23 ns |    23.143 ns |    12.104 ns |     - |     - |     - |      56 B |
|          PublicSync | Uncached4096 | 32,063.81 ns | 1,233.390 ns |   645.087 ns |     - |     - |     - |   9,532 B |
|        **PreparedSync** |    **Uncached9** |    **175.23 ns** |     **2.866 ns** |     **1.499 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |    Uncached9 |    176.02 ns |     1.973 ns |     1.032 ns |     - |     - |     - |      56 B |
|          PublicSync |    Uncached9 | 30,535.33 ns | 1,770.603 ns |   926.059 ns |     - |     - |     - |   9,530 B |
