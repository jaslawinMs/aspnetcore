``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|       Method |          Profile |           Mean |           Error |         StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------- |----------------- |---------------:|----------------:|---------------:|-------:|------:|------:|----------:|
| **LegacyBridge** |   **CachedOriginal** |       **4.951 ns** |       **0.2522 ns** |      **0.1319 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |   CachedOriginal |      14.949 ns |       0.0635 ns |      0.0332 ns |      - |     - |     - |         - |
|  ModernAsync |   CachedOriginal |      14.759 ns |       0.0923 ns |      0.0483 ns |      - |     - |     - |         - |
| **LegacyBridge** |     **CompiledSelf** |       **8.074 ns** |       **0.2204 ns** |      **0.1153 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |     CompiledSelf |       9.570 ns |       0.1181 ns |      0.0618 ns |      - |     - |     - |         - |
|  ModernAsync |     CompiledSelf |      18.935 ns |       0.2327 ns |      0.1217 ns |      - |     - |     - |         - |
| **LegacyBridge** | **FreshPrecompiled** |  **73,426.199 ns** |   **2,548.5949 ns** |  **1,332.9644 ns** | **0.7267** |     **-** |     **-** |  **40,643 B** |
|   ModernWait | FreshPrecompiled |  72,613.371 ns |   1,393.1930 ns |    728.6669 ns | 0.7184 |     - |     - |  40,643 B |
|  ModernAsync | FreshPrecompiled |  72,813.963 ns |   1,248.6077 ns |    653.0460 ns | 0.7267 |     - |     - |  40,643 B |
| **LegacyBridge** | **GatedPrecompiled** | **304,850.217 ns** | **153,866.6090 ns** | **80,475.2117 ns** |      **-** |     **-** |     **-** |  **41,422 B** |
|   ModernWait | GatedPrecompiled | 245,283.416 ns | 165,643.2848 ns | 86,634.6408 ns |      - |     - |     - |  41,443 B |
|  ModernAsync | GatedPrecompiled | 121,593.470 ns |   5,364.1175 ns |  2,805.5372 ns |      - |     - |     - |  41,487 B |
