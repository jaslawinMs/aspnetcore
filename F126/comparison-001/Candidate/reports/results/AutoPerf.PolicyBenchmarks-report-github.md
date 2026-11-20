``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F126  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                 Method |      Profile |         Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------------- |------------- |-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
|            **WarmRequest** | **MinimumAge10** | **154,519.9 ns** |  **9,449.72 ns** |  **4,942.38 ns** |      **-** |     **-** |     **-** |  **14,294 B** |
| CachingDisabledRequest | MinimumAge10 | 106,660.5 ns | 20,089.29 ns | 10,507.09 ns |      - |     - |     - |  16,166 B |
|        DirectGetPolicy | MinimumAge10 |     145.3 ns |     30.75 ns |     16.09 ns | 0.0129 |     - |     - |     520 B |
|            **WarmRequest** | **MinimumAge50** |  **38,743.5 ns** |  **2,291.27 ns** |  **1,198.38 ns** | **0.3701** |     **-** |     **-** |  **14,328 B** |
| CachingDisabledRequest | MinimumAge50 |  41,394.3 ns |  4,637.66 ns |  2,425.58 ns | 0.3814 |     - |     - |  15,647 B |
|        DirectGetPolicy | MinimumAge50 |     138.6 ns |     13.70 ns |      7.16 ns | 0.0132 |     - |     - |     520 B |
