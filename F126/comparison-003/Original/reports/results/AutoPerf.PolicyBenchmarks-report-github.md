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
|            **WarmRequest** | **MinimumAge10** | **159,193.7 ns** |  **8,340.91 ns** |  **4,362.46 ns** |      **-** |     **-** |     **-** |  **15,552 B** |
| CachingDisabledRequest | MinimumAge10 |  99,949.6 ns | 22,303.78 ns | 11,665.31 ns |      - |     - |     - |  16,265 B |
|        DirectGetPolicy | MinimumAge10 |     132.0 ns |      6.09 ns |      3.19 ns | 0.0118 |     - |     - |     520 B |
|            **WarmRequest** | **MinimumAge50** |  **41,623.7 ns** |  **3,716.42 ns** |  **1,943.76 ns** | **0.4014** |     **-** |     **-** |  **15,621 B** |
| CachingDisabledRequest | MinimumAge50 |  41,519.9 ns |  2,471.68 ns |  1,292.74 ns | 0.4055 |     - |     - |  15,610 B |
|        DirectGetPolicy | MinimumAge50 |     133.8 ns |      9.93 ns |      5.19 ns | 0.0125 |     - |     - |     520 B |
