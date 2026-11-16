``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|       Method |          Profile |           Mean |           Error |          StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------- |----------------- |---------------:|----------------:|----------------:|-------:|------:|------:|----------:|
| **LegacyBridge** |   **CachedOriginal** |       **4.964 ns** |       **0.1421 ns** |       **0.0743 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |   CachedOriginal |       5.539 ns |       0.1102 ns |       0.0576 ns |      - |     - |     - |         - |
|  ModernAsync |   CachedOriginal |      15.811 ns |       0.2556 ns |       0.1337 ns |      - |     - |     - |         - |
| **LegacyBridge** |     **CompiledSelf** |       **9.093 ns** |       **0.3900 ns** |       **0.2040 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |     CompiledSelf |      10.069 ns |       0.2815 ns |       0.1472 ns |      - |     - |     - |         - |
|  ModernAsync |     CompiledSelf |      18.426 ns |       0.2045 ns |       0.1070 ns |      - |     - |     - |         - |
| **LegacyBridge** | **FreshPrecompiled** |  **72,949.928 ns** |   **2,288.7745 ns** |   **1,197.0733 ns** | **0.7184** |     **-** |     **-** |  **40,642 B** |
|   ModernWait | FreshPrecompiled |  72,895.976 ns |   1,268.9575 ns |     663.6893 ns | 0.7267 |     - |     - |  40,643 B |
|  ModernAsync | FreshPrecompiled |  72,946.372 ns |   1,871.9914 ns |     979.0877 ns | 0.7184 |     - |     - |  40,642 B |
| **LegacyBridge** | **GatedPrecompiled** | **394,864.519 ns** | **210,912.4588 ns** | **110,311.2941 ns** |      **-** |     **-** |     **-** |  **41,415 B** |
|   ModernWait | GatedPrecompiled | 422,097.731 ns | 177,587.7619 ns |  92,881.8333 ns |      - |     - |     - |  41,439 B |
|  ModernAsync | GatedPrecompiled | 121,238.251 ns |   3,548.2550 ns |   1,855.8060 ns |      - |     - |     - |  41,488 B |
