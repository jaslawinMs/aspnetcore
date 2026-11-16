``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                Method |          Profile |        Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------- |----------------- |------------:|-------------:|-------------:|-------:|------:|------:|----------:|
|          **PreparedSync** |  **AsyncCompleted1** |    **896.2 ns** |    **304.51 ns** |    **159.26 ns** | **0.0421** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |  AsyncCompleted1 |    720.5 ns |     70.80 ns |     37.03 ns | 0.0417 |     - |     - |      2 KB |
|    PublicExplicitSync |  AsyncCompleted1 | 85,560.9 ns |  3,303.24 ns |  1,727.66 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |  AsyncCompleted1 | 59,705.9 ns | 21,403.21 ns | 11,194.29 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **AsyncCompleted16** |  **2,520.5 ns** |     **39.76 ns** |     **20.80 ns** | **0.0811** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync | AsyncCompleted16 |  2,531.4 ns |     50.32 ns |     26.32 ns | 0.1003 |     - |     - |      4 KB |
|    PublicExplicitSync | AsyncCompleted16 | 35,641.0 ns |  1,605.30 ns |    839.60 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync | AsyncCompleted16 | 36,005.8 ns |  2,905.48 ns |  1,519.62 ns |      - |     - |     - |     12 KB |
|          **PreparedSync** |   **DualCompleted1** |    **703.6 ns** |     **16.85 ns** |      **8.81 ns** | **0.0474** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |   DualCompleted1 |    691.0 ns |     22.59 ns |     11.82 ns | 0.0417 |     - |     - |      2 KB |
|    PublicExplicitSync |   DualCompleted1 | 33,006.1 ns |    708.66 ns |    370.65 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |   DualCompleted1 | 33,578.1 ns |    777.10 ns |    406.44 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |       **EmptyScope** |    **475.9 ns** |     **11.38 ns** |      **5.95 ns** | **0.0371** |     **-** |     **-** |      **1 KB** |
|         PreparedAsync |       EmptyScope |    504.9 ns |     72.47 ns |     37.91 ns | 0.0332 |     - |     - |      1 KB |
|    PublicExplicitSync |       EmptyScope | 32,626.4 ns |    844.99 ns |    441.95 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |       EmptyScope | 32,737.6 ns |    738.40 ns |    386.20 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **SourceCompleted1** |    **731.9 ns** |     **17.21 ns** |      **9.00 ns** | **0.0446** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync | SourceCompleted1 |    729.9 ns |     18.54 ns |      9.70 ns | 0.0434 |     - |     - |      2 KB |
|    PublicExplicitSync | SourceCompleted1 | 33,586.1 ns |  2,483.62 ns |  1,298.98 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync | SourceCompleted1 | 33,451.7 ns |    495.84 ns |    259.33 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |            **Sync1** |    **678.4 ns** |     **18.97 ns** |      **9.92 ns** | **0.0409** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |            Sync1 |    690.0 ns |     67.56 ns |     35.34 ns | 0.0416 |     - |     - |      2 KB |
|    PublicExplicitSync |            Sync1 | 33,687.1 ns |    884.05 ns |    462.37 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |            Sync1 | 33,661.1 ns |  2,456.56 ns |  1,284.83 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |           **Sync16** |  **2,628.3 ns** |    **140.30 ns** |     **73.38 ns** | **0.0784** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync |           Sync16 |  2,668.4 ns |    182.54 ns |     95.47 ns | 0.0776 |     - |     - |      4 KB |
|    PublicExplicitSync |           Sync16 | 35,645.2 ns |  2,130.03 ns |  1,114.05 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync |           Sync16 | 37,225.0 ns |  4,756.29 ns |  2,487.63 ns |      - |     - |     - |     12 KB |
