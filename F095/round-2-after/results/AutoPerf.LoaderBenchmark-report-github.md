``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|       Method |          Profile |           Mean |           Error |          StdDev |         Median |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------- |----------------- |---------------:|----------------:|----------------:|---------------:|-------:|------:|------:|----------:|
| **LegacyBridge** |   **CachedOriginal** |       **4.642 ns** |       **0.1908 ns** |       **0.0998 ns** |       **4.616 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |   CachedOriginal |       5.895 ns |       0.1128 ns |       0.0590 ns |       5.867 ns |      - |     - |     - |         - |
|  ModernAsync |   CachedOriginal |      15.420 ns |       0.0833 ns |       0.0436 ns |      15.413 ns |      - |     - |     - |         - |
| **LegacyBridge** |     **CompiledSelf** |       **9.037 ns** |       **0.0680 ns** |       **0.0356 ns** |       **9.043 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |     CompiledSelf |       9.278 ns |       0.2855 ns |       0.1493 ns |       9.347 ns |      - |     - |     - |         - |
|  ModernAsync |     CompiledSelf |      19.660 ns |       0.2583 ns |       0.1351 ns |      19.659 ns |      - |     - |     - |         - |
| **LegacyBridge** | **FreshPrecompiled** |  **73,242.813 ns** |   **1,759.1964 ns** |     **920.0938 ns** |  **73,096.103 ns** | **0.7353** |     **-** |     **-** |  **40,643 B** |
|   ModernWait | FreshPrecompiled |  73,624.509 ns |   2,440.9085 ns |   1,276.6423 ns |  73,233.975 ns | 0.7267 |     - |     - |  40,643 B |
|  ModernAsync | FreshPrecompiled |  72,971.642 ns |   1,574.7753 ns |     823.6379 ns |  72,704.921 ns | 0.7184 |     - |     - |  40,643 B |
| **LegacyBridge** | **GatedPrecompiled** | **478,406.364 ns** | **380,449.4752 ns** | **198,982.4319 ns** | **431,883.464 ns** |      **-** |     **-** |     **-** |  **41,417 B** |
|   ModernWait | GatedPrecompiled | 413,701.094 ns | 804,908.0851 ns | 420,982.4921 ns | 211,816.562 ns |      - |     - |     - |  41,480 B |
|  ModernAsync | GatedPrecompiled | 122,320.072 ns |   3,301.6432 ns |   1,726.8232 ns | 121,903.546 ns |      - |     - |     - |  41,488 B |
