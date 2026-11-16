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
|        **PreparedSync** |      **Cached1** |    **171.68 ns** |     **3.792 ns** |     **1.984 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached1 |    173.25 ns |    16.826 ns |     8.800 ns |     - |     - |     - |      56 B |
|          PublicSync |      Cached1 | 81,737.43 ns | 9,172.542 ns | 4,797.417 ns |     - |     - |     - |   9,798 B |
|        **PreparedSync** |      **Cached8** |    **174.36 ns** |     **8.064 ns** |     **4.218 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |      Cached8 |    174.21 ns |     1.766 ns |     0.924 ns |     - |     - |     - |      56 B |
|          PublicSync |      Cached8 | 28,197.98 ns |   620.002 ns |   324.273 ns |     - |     - |     - |   9,498 B |
|        **PreparedSync** |          **Eof** |     **31.06 ns** |     **0.316 ns** |     **0.165 ns** |     **-** |     **-** |     **-** |         **-** |
| PreparedMemoryAsync |          Eof |     30.47 ns |     0.536 ns |     0.280 ns |     - |     - |     - |         - |
|          PublicSync |          Eof | 28,055.63 ns | 1,490.170 ns |   779.388 ns |     - |     - |     - |   9,448 B |
|        **PreparedSync** |    **Partial16** |    **171.58 ns** |     **2.405 ns** |     **1.258 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |    Partial16 |    174.62 ns |     6.174 ns |     3.229 ns |     - |     - |     - |      56 B |
|          PublicSync |    Partial16 | 27,577.58 ns |   664.585 ns |   347.591 ns |     - |     - |     - |   9,526 B |
|        **PreparedSync** |   **Uncached16** |    **173.72 ns** |     **2.516 ns** |     **1.316 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |   Uncached16 |    175.67 ns |     1.197 ns |     0.626 ns |     - |     - |     - |      56 B |
|          PublicSync |   Uncached16 | 28,289.49 ns | 1,428.930 ns |   747.358 ns |     - |     - |     - |   9,531 B |
|        **PreparedSync** |  **Uncached256** |    **181.58 ns** |     **2.301 ns** |     **1.204 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |  Uncached256 |    174.42 ns |     2.793 ns |     1.461 ns |     - |     - |     - |      56 B |
|          PublicSync |  Uncached256 | 28,354.29 ns | 1,451.682 ns |   759.258 ns |     - |     - |     - |   9,528 B |
|        **PreparedSync** | **Uncached4096** |    **229.48 ns** |     **2.565 ns** |     **1.342 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync | Uncached4096 |    239.62 ns |    10.014 ns |     5.238 ns |     - |     - |     - |      56 B |
|          PublicSync | Uncached4096 | 30,402.65 ns | 1,690.805 ns |   884.324 ns |     - |     - |     - |   9,516 B |
|        **PreparedSync** |    **Uncached9** |    **191.19 ns** |    **38.760 ns** |    **20.272 ns** |     **-** |     **-** |     **-** |      **56 B** |
| PreparedMemoryAsync |    Uncached9 |    175.08 ns |     5.341 ns |     2.794 ns |     - |     - |     - |      56 B |
|          PublicSync |    Uncached9 | 28,629.63 ns | 1,207.229 ns |   631.404 ns |     - |     - |     - |   9,523 B |
