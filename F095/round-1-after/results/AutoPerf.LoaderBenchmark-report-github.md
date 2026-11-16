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
| **LegacyBridge** |   **CachedOriginal** |       **4.609 ns** |       **0.0935 ns** |       **0.0489 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |   CachedOriginal |       5.578 ns |       0.1086 ns |       0.0568 ns |      - |     - |     - |         - |
|  ModernAsync |   CachedOriginal |      16.191 ns |       0.3129 ns |       0.1636 ns |      - |     - |     - |         - |
| **LegacyBridge** |     **CompiledSelf** |       **9.110 ns** |       **0.2099 ns** |       **0.1098 ns** |      **-** |     **-** |     **-** |         **-** |
|   ModernWait |     CompiledSelf |       9.719 ns |       0.2188 ns |       0.1144 ns |      - |     - |     - |         - |
|  ModernAsync |     CompiledSelf |      20.264 ns |       0.3216 ns |       0.1682 ns |      - |     - |     - |         - |
| **LegacyBridge** | **FreshPrecompiled** |  **74,543.622 ns** |   **8,351.3456 ns** |   **4,367.9152 ns** | **0.9328** |     **-** |     **-** |  **40,646 B** |
|   ModernWait | FreshPrecompiled |  72,071.902 ns |   1,636.3582 ns |     855.8470 ns | 0.7102 |     - |     - |  40,642 B |
|  ModernAsync | FreshPrecompiled |  72,333.522 ns |   1,676.5899 ns |     876.8889 ns | 0.7184 |     - |     - |  40,643 B |
| **LegacyBridge** | **GatedPrecompiled** | **322,826.884 ns** | **273,317.3726 ns** | **142,950.2707 ns** |      **-** |     **-** |     **-** |  **41,448 B** |
|   ModernWait | GatedPrecompiled | 300,402.407 ns | 167,484.1971 ns |  87,597.4736 ns |      - |     - |     - |  41,422 B |
|  ModernAsync | GatedPrecompiled | 121,353.420 ns |   3,334.5508 ns |   1,744.0346 ns |      - |     - |     - |  41,487 B |
