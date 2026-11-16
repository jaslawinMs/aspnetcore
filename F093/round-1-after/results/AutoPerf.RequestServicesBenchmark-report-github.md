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
|          **PreparedSync** |  **AsyncCompleted1** |    **720.4 ns** |      **6.49 ns** |      **3.39 ns** | **0.0432** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |  AsyncCompleted1 |    679.2 ns |     11.41 ns |      5.97 ns | 0.0419 |     - |     - |      2 KB |
|    PublicExplicitSync |  AsyncCompleted1 | 89,720.3 ns |  9,972.29 ns |  5,215.70 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |  AsyncCompleted1 | 74,268.3 ns | 22,237.66 ns | 11,630.72 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **AsyncCompleted16** |  **2,529.9 ns** |     **36.07 ns** |     **18.87 ns** | **0.0786** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync | AsyncCompleted16 |  2,514.5 ns |     46.37 ns |     24.25 ns | 0.0767 |     - |     - |      4 KB |
|    PublicExplicitSync | AsyncCompleted16 | 35,755.5 ns |  1,359.95 ns |    711.28 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync | AsyncCompleted16 | 36,158.0 ns |  1,141.81 ns |    597.19 ns |      - |     - |     - |     12 KB |
|          **PreparedSync** |   **DualCompleted1** |    **738.6 ns** |     **78.16 ns** |     **40.88 ns** | **0.0443** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |   DualCompleted1 |    712.8 ns |     31.43 ns |     16.44 ns | 0.0428 |     - |     - |      2 KB |
|    PublicExplicitSync |   DualCompleted1 | 32,777.2 ns |  2,054.53 ns |  1,074.56 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |   DualCompleted1 | 33,394.9 ns |  1,408.03 ns |    736.43 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |       **EmptyScope** |    **501.9 ns** |     **23.31 ns** |     **12.19 ns** | **0.0357** |     **-** |     **-** |      **1 KB** |
|         PreparedAsync |       EmptyScope |    504.2 ns |     47.55 ns |     24.87 ns | 0.0355 |     - |     - |      1 KB |
|    PublicExplicitSync |       EmptyScope | 32,867.8 ns |  3,188.71 ns |  1,667.76 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |       EmptyScope | 32,575.7 ns |  1,777.99 ns |    929.92 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **SourceCompleted1** |    **782.7 ns** |     **47.35 ns** |     **24.77 ns** | **0.0467** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync | SourceCompleted1 |    760.8 ns |     23.35 ns |     12.21 ns | 0.0447 |     - |     - |      2 KB |
|    PublicExplicitSync | SourceCompleted1 | 33,153.2 ns |  1,721.75 ns |    900.51 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync | SourceCompleted1 | 33,217.4 ns |  1,246.62 ns |    652.00 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |            **Sync1** |    **717.2 ns** |     **40.40 ns** |     **21.13 ns** | **0.0429** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |            Sync1 |    711.5 ns |     28.67 ns |     15.00 ns | 0.0420 |     - |     - |      2 KB |
|    PublicExplicitSync |            Sync1 | 32,321.2 ns |    798.30 ns |    417.52 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |            Sync1 | 32,502.5 ns |  1,054.73 ns |    551.65 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |           **Sync16** |  **2,657.8 ns** |     **36.82 ns** |     **19.26 ns** | **0.0781** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync |           Sync16 |  2,621.0 ns |     45.57 ns |     23.83 ns | 0.0790 |     - |     - |      4 KB |
|    PublicExplicitSync |           Sync16 | 35,402.3 ns |  1,600.63 ns |    837.16 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync |           Sync16 | 36,053.1 ns |  1,792.92 ns |    937.73 ns |      - |     - |     - |     12 KB |
