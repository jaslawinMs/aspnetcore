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
|          **PreparedSync** |  **AsyncCompleted1** |    **706.0 ns** |     **26.33 ns** |    **13.77 ns** | **0.0416** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |  AsyncCompleted1 |    759.1 ns |     40.97 ns |    21.43 ns | 0.0433 |     - |     - |      2 KB |
|    PublicExplicitSync |  AsyncCompleted1 | 91,229.2 ns |  8,022.04 ns | 4,195.68 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |  AsyncCompleted1 | 55,418.7 ns | 15,806.66 ns | 8,267.19 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **AsyncCompleted16** |  **2,563.1 ns** |     **21.54 ns** |    **11.27 ns** | **0.1010** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync | AsyncCompleted16 |  2,604.0 ns |     43.57 ns |    22.79 ns | 0.0771 |     - |     - |      4 KB |
|    PublicExplicitSync | AsyncCompleted16 | 36,091.9 ns |  2,952.80 ns | 1,544.37 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync | AsyncCompleted16 | 36,328.3 ns |  2,581.53 ns | 1,350.19 ns |      - |     - |     - |     12 KB |
|          **PreparedSync** |   **DualCompleted1** |    **722.1 ns** |     **43.20 ns** |    **22.60 ns** | **0.0431** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |   DualCompleted1 |    782.5 ns |    153.58 ns |    80.32 ns | 0.0457 |     - |     - |      2 KB |
|    PublicExplicitSync |   DualCompleted1 | 34,746.5 ns |  4,592.64 ns | 2,402.04 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |   DualCompleted1 | 33,616.1 ns |  1,103.29 ns |   577.04 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |       **EmptyScope** |    **523.4 ns** |     **67.60 ns** |    **35.35 ns** | **0.0347** |     **-** |     **-** |      **1 KB** |
|         PreparedAsync |       EmptyScope |    546.4 ns |     15.42 ns |     8.07 ns | 0.0374 |     - |     - |      1 KB |
|    PublicExplicitSync |       EmptyScope | 33,258.5 ns |  2,109.52 ns | 1,103.32 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |       EmptyScope | 33,219.3 ns |  3,785.16 ns | 1,979.71 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **SourceCompleted1** |    **742.7 ns** |     **29.29 ns** |    **15.32 ns** | **0.0442** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync | SourceCompleted1 |    798.6 ns |     26.21 ns |    13.71 ns | 0.0416 |     - |     - |      2 KB |
|    PublicExplicitSync | SourceCompleted1 | 35,574.4 ns |  3,587.98 ns | 1,876.58 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync | SourceCompleted1 | 35,361.4 ns |  3,298.51 ns | 1,725.19 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |            **Sync1** |    **716.0 ns** |     **38.64 ns** |    **20.21 ns** | **0.0465** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |            Sync1 |    888.0 ns |    196.18 ns |   102.61 ns | 0.0470 |     - |     - |      2 KB |
|    PublicExplicitSync |            Sync1 | 33,771.9 ns |  3,750.21 ns | 1,961.43 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |            Sync1 | 32,928.1 ns |    696.06 ns |   364.06 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |           **Sync16** |  **2,655.9 ns** |    **135.19 ns** |    **70.71 ns** | **0.0785** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync |           Sync16 |  2,718.6 ns |     56.62 ns |    29.61 ns | 0.0812 |     - |     - |      4 KB |
|    PublicExplicitSync |           Sync16 | 36,637.4 ns |  5,418.12 ns | 2,833.78 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync |           Sync16 | 36,720.0 ns |  3,719.68 ns | 1,945.46 ns |      - |     - |     - |     12 KB |
