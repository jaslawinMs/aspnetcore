``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                Method |          Profile |        Mean |        Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------- |----------------- |------------:|-------------:|------------:|-------:|------:|------:|----------:|
|          **PreparedSync** |  **AsyncCompleted1** |    **712.6 ns** |     **50.32 ns** |    **26.32 ns** | **0.0413** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |  AsyncCompleted1 |    704.1 ns |     30.87 ns |    16.15 ns | 0.0421 |     - |     - |      2 KB |
|    PublicExplicitSync |  AsyncCompleted1 | 88,759.6 ns |  6,450.87 ns | 3,373.93 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |  AsyncCompleted1 | 80,712.5 ns | 13,022.55 ns | 6,811.05 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **AsyncCompleted16** |  **2,585.7 ns** |    **263.61 ns** |   **137.87 ns** | **0.0799** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync | AsyncCompleted16 |  2,537.9 ns |     30.24 ns |    15.82 ns | 0.0767 |     - |     - |      4 KB |
|    PublicExplicitSync | AsyncCompleted16 | 36,648.6 ns |  2,298.85 ns | 1,202.35 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync | AsyncCompleted16 | 36,768.9 ns |  1,701.16 ns |   889.74 ns |      - |     - |     - |     12 KB |
|          **PreparedSync** |   **DualCompleted1** |    **730.2 ns** |    **107.74 ns** |    **56.35 ns** | **0.0475** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |   DualCompleted1 |    708.9 ns |     73.84 ns |    38.62 ns | 0.0413 |     - |     - |      2 KB |
|    PublicExplicitSync |   DualCompleted1 | 33,826.3 ns |  1,082.44 ns |   566.14 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |   DualCompleted1 | 33,499.0 ns |    607.10 ns |   317.52 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |       **EmptyScope** |    **505.1 ns** |     **76.59 ns** |    **40.06 ns** | **0.0349** |     **-** |     **-** |      **1 KB** |
|         PreparedAsync |       EmptyScope |    491.3 ns |     49.88 ns |    26.09 ns | 0.0344 |     - |     - |      1 KB |
|    PublicExplicitSync |       EmptyScope | 33,608.3 ns |  2,089.47 ns | 1,092.83 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |       EmptyScope | 33,265.2 ns |    814.93 ns |   426.22 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **SourceCompleted1** |    **730.7 ns** |     **19.70 ns** |    **10.30 ns** | **0.0427** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync | SourceCompleted1 |    749.9 ns |     94.29 ns |    49.31 ns | 0.0439 |     - |     - |      2 KB |
|    PublicExplicitSync | SourceCompleted1 | 34,113.1 ns |  1,769.92 ns |   925.70 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync | SourceCompleted1 | 34,598.2 ns |    696.36 ns |   364.21 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |            **Sync1** |    **725.0 ns** |     **63.70 ns** |    **33.32 ns** | **0.0416** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |            Sync1 |    728.2 ns |     22.10 ns |    11.56 ns | 0.0436 |     - |     - |      2 KB |
|    PublicExplicitSync |            Sync1 | 34,483.1 ns |  1,586.08 ns |   829.55 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |            Sync1 | 33,983.7 ns |  1,763.30 ns |   922.24 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |           **Sync16** |  **2,645.5 ns** |    **138.18 ns** |    **72.27 ns** | **0.0775** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync |           Sync16 |  2,631.3 ns |     37.97 ns |    19.86 ns | 0.0787 |     - |     - |      4 KB |
|    PublicExplicitSync |           Sync16 | 36,840.0 ns |  2,196.98 ns | 1,149.07 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync |           Sync16 | 37,456.6 ns |  2,450.27 ns | 1,281.54 ns |      - |     - |     - |     12 KB |
