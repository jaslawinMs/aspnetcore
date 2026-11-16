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
|          **PreparedSync** |  **AsyncCompleted1** |    **683.3 ns** |     **35.78 ns** |    **18.72 ns** | **0.0410** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |  AsyncCompleted1 |    716.4 ns |     36.25 ns |    18.96 ns | 0.0415 |     - |     - |      2 KB |
|    PublicExplicitSync |  AsyncCompleted1 | 84,840.9 ns |  1,250.07 ns |   653.81 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |  AsyncCompleted1 | 47,129.7 ns | 15,501.27 ns | 8,107.46 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **AsyncCompleted16** |  **2,541.3 ns** |     **32.73 ns** |    **17.12 ns** | **0.0767** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync | AsyncCompleted16 |  2,578.0 ns |     53.49 ns |    27.98 ns | 0.0784 |     - |     - |      4 KB |
|    PublicExplicitSync | AsyncCompleted16 | 34,729.8 ns |    985.67 ns |   515.53 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync | AsyncCompleted16 | 35,456.5 ns |    867.04 ns |   453.48 ns |      - |     - |     - |     12 KB |
|          **PreparedSync** |   **DualCompleted1** |    **747.6 ns** |     **65.94 ns** |    **34.49 ns** | **0.0421** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |   DualCompleted1 |    730.4 ns |     24.51 ns |    12.82 ns | 0.0432 |     - |     - |      2 KB |
|    PublicExplicitSync |   DualCompleted1 | 32,670.4 ns |  1,569.75 ns |   821.01 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |   DualCompleted1 | 32,702.9 ns |    726.96 ns |   380.21 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |       **EmptyScope** |    **521.7 ns** |     **46.89 ns** |    **24.53 ns** | **0.0360** |     **-** |     **-** |      **1 KB** |
|         PreparedAsync |       EmptyScope |    519.9 ns |     25.94 ns |    13.57 ns | 0.0360 |     - |     - |      1 KB |
|    PublicExplicitSync |       EmptyScope | 31,873.4 ns |    702.84 ns |   367.60 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |       EmptyScope | 32,706.3 ns |  2,826.00 ns | 1,478.06 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** | **SourceCompleted1** |    **753.4 ns** |     **28.27 ns** |    **14.79 ns** | **0.0452** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync | SourceCompleted1 |    775.2 ns |     66.25 ns |    34.65 ns | 0.0445 |     - |     - |      2 KB |
|    PublicExplicitSync | SourceCompleted1 | 32,728.3 ns |  1,557.08 ns |   814.38 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync | SourceCompleted1 | 33,630.3 ns |  1,875.38 ns |   980.86 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |            **Sync1** |    **713.7 ns** |     **35.41 ns** |    **18.52 ns** | **0.0429** |     **-** |     **-** |      **2 KB** |
|         PreparedAsync |            Sync1 |    740.0 ns |     67.84 ns |    35.48 ns | 0.0432 |     - |     - |      2 KB |
|    PublicExplicitSync |            Sync1 | 33,695.8 ns |  2,692.68 ns | 1,408.32 ns |      - |     - |     - |     10 KB |
| PublicRegisteredAsync |            Sync1 | 33,012.3 ns |  3,563.20 ns | 1,863.62 ns |      - |     - |     - |     10 KB |
|          **PreparedSync** |           **Sync16** |  **2,644.1 ns** |     **60.63 ns** |    **31.71 ns** | **0.0793** |     **-** |     **-** |      **4 KB** |
|         PreparedAsync |           Sync16 |  2,652.0 ns |     63.95 ns |    33.45 ns | 0.0777 |     - |     - |      4 KB |
|    PublicExplicitSync |           Sync16 | 35,538.2 ns |  1,013.85 ns |   530.26 ns |      - |     - |     - |     12 KB |
| PublicRegisteredAsync |           Sync16 | 35,550.7 ns |  1,581.29 ns |   827.05 ns |      - |     - |     - |     12 KB |
