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
| **LegacyBridge** |   **CachedOriginal** |       **4.915 ns** |       **0.0670 ns** |       **0.0351 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |   CachedOriginal |       5.898 ns |       0.0820 ns |       0.0429 ns |      - |     - |     - |         - |
|  ModernAsync |   CachedOriginal |      14.730 ns |       0.2139 ns |       0.1119 ns |      - |     - |     - |         - |
| **LegacyBridge** |     **CompiledSelf** |       **9.120 ns** |       **0.1463 ns** |       **0.0765 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |     CompiledSelf |      10.326 ns |       0.4228 ns |       0.2212 ns |      - |     - |     - |         - |
|  ModernAsync |     CompiledSelf |      18.677 ns |       0.3699 ns |       0.1935 ns |      - |     - |     - |         - |
| **LegacyBridge** | **FreshPrecompiled** |  **74,057.086 ns** |   **2,519.7801 ns** |   **1,317.8937 ns** | **0.7267** |     **-** |     **-** |  **40,643 B** |
|   ModernWait | FreshPrecompiled |  73,814.347 ns |     724.6613 ns |     379.0119 ns | 0.7353 |     - |     - |  40,643 B |
|  ModernAsync | FreshPrecompiled |  74,831.866 ns |   3,593.3046 ns |   1,879.3678 ns | 0.7353 |     - |     - |  40,643 B |
| **LegacyBridge** | **GatedPrecompiled** | **265,790.092 ns** |  **99,237.7267 ns** |  **51,903.2499 ns** |      **-** |     **-** |     **-** |  **41,418 B** |
|   ModernWait | GatedPrecompiled | 438,055.379 ns | 436,437.0182 ns | 228,264.9994 ns |      - |     - |     - |  41,432 B |
|  ModernAsync | GatedPrecompiled | 122,503.951 ns |   4,683.7171 ns |   2,449.6746 ns |      - |     - |     - |  41,488 B |
