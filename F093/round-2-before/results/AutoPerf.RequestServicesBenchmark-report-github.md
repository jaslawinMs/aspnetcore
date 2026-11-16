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
|          **PreparedSync** |  **AsyncCompleted1** |    **721.3 ns** |     **87.52 ns** |    **45.78 ns** | **0.0418** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |  AsyncCompleted1 |    743.2 ns |     59.18 ns |    30.95 ns | 0.0437 |     - |     - |      2 KB |
|    PublicExplicitSync |  AsyncCompleted1 | 92,718.8 ns |  7,834.81 ns | 4,097.76 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |  AsyncCompleted1 | 59,330.4 ns | 15,715.99 ns | 8,219.76 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **AsyncCompleted16** |  **2,593.8 ns** |    **215.02 ns** |   **112.46 ns** | **0.1012** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync | AsyncCompleted16 |  2,524.6 ns |     75.58 ns |    39.53 ns | 0.0787 |     - |     - |      4 KB |
|    PublicExplicitSync | AsyncCompleted16 | 35,640.5 ns |  1,030.59 ns |   539.02 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync | AsyncCompleted16 | 35,578.6 ns |    516.77 ns |   270.28 ns |      - |     - |     - |     12 KB |
|          **PreparedSync** |   **DualCompleted1** |    **691.4 ns** |     **22.25 ns** |    **11.64 ns** | **0.0425** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |   DualCompleted1 |    724.3 ns |     75.38 ns |    39.43 ns | 0.0427 |     - |     - |      2 KB |
|    PublicExplicitSync |   DualCompleted1 | 33,396.1 ns |  1,372.11 ns |   717.64 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |   DualCompleted1 | 34,038.1 ns |  2,250.52 ns | 1,177.07 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |       **EmptyScope** |    **521.6 ns** |     **77.04 ns** |    **40.29 ns** | **0.0340** |     **-** |     **-** |      **1 KB** |
|         PreparedAsync |       EmptyScope |    526.0 ns |    117.67 ns |    61.54 ns | 0.0367 |     - |     - |      1 KB |
|    PublicExplicitSync |       EmptyScope | 33,293.1 ns |  4,189.01 ns | 2,190.93 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |       EmptyScope | 33,121.4 ns |  1,873.75 ns |   980.01 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **SourceCompleted1** |    **733.9 ns** |     **13.49 ns** |     **7.05 ns** | **0.0445** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync | SourceCompleted1 |    746.1 ns |     10.76 ns |     5.63 ns | 0.0452 |     - |     - |      2 KB |
|    PublicExplicitSync | SourceCompleted1 | 33,783.5 ns |  1,450.32 ns |   758.55 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync | SourceCompleted1 | 35,112.5 ns |  4,932.28 ns | 2,579.68 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |            **Sync1** |    **700.3 ns** |     **28.47 ns** |    **14.89 ns** | **0.0417** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |            Sync1 |    802.3 ns |    207.04 ns |   108.28 ns | 0.0427 |     - |     - |      2 KB |
|    PublicExplicitSync |            Sync1 | 32,600.4 ns |  1,882.09 ns |   984.37 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |            Sync1 | 33,487.6 ns |  1,664.33 ns |   870.48 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |           **Sync16** |  **2,602.1 ns** |    **130.94 ns** |    **68.48 ns** | **0.0783** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync |           Sync16 |  2,598.0 ns |     41.50 ns |    21.71 ns | 0.0777 |     - |     - |      4 KB |
|    PublicExplicitSync |           Sync16 | 37,160.3 ns |  3,460.36 ns | 1,809.84 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync |           Sync16 | 36,900.6 ns |  1,983.59 ns | 1,037.46 ns |      - |     - |     - |     12 KB |
