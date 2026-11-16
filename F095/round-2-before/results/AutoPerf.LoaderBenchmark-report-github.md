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
| **LegacyBridge** |   **CachedOriginal** |       **4.912 ns** |       **0.0956 ns** |       **0.0500 ns** |       **4.899 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |   CachedOriginal |       5.596 ns |       0.1602 ns |       0.0838 ns |       5.585 ns |      - |     - |     - |         - |
|  ModernAsync |   CachedOriginal |      15.185 ns |       0.1635 ns |       0.0855 ns |      15.180 ns |      - |     - |     - |         - |
| **LegacyBridge** |     **CompiledSelf** |       **9.120 ns** |       **0.1425 ns** |       **0.0746 ns** |       **9.100 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |     CompiledSelf |       9.630 ns |       0.4028 ns |       0.2107 ns |       9.565 ns |      - |     - |     - |         - |
|  ModernAsync |     CompiledSelf |      19.190 ns |       0.2296 ns |       0.1201 ns |      19.185 ns |      - |     - |     - |         - |
| **LegacyBridge** | **FreshPrecompiled** |  **72,097.378 ns** |   **1,072.4231 ns** |     **560.8980 ns** |  **72,237.249 ns** | **0.7184** |     **-** |     **-** |  **40,643 B** |
|   ModernWait | FreshPrecompiled |  72,775.400 ns |   2,184.7981 ns |   1,142.6917 ns |  72,811.519 ns | 0.7267 |     - |     - |  40,643 B |
|  ModernAsync | FreshPrecompiled |  76,259.666 ns |   9,570.8728 ns |   5,005.7515 ns |  73,646.802 ns | 0.7267 |     - |     - |  40,643 B |
| **LegacyBridge** | **GatedPrecompiled** | **355,108.721 ns** | **172,324.7652 ns** |  **90,129.1843 ns** | **365,935.174 ns** |      **-** |     **-** |     **-** |  **41,418 B** |
|   ModernWait | GatedPrecompiled | 460,781.033 ns | 602,579.2462 ns | 315,160.5972 ns | 308,460.590 ns |      - |     - |     - |  41,445 B |
|  ModernAsync | GatedPrecompiled | 120,047.037 ns |   3,835.2377 ns |   2,005.9035 ns | 119,951.238 ns |      - |     - |     - |  41,488 B |
