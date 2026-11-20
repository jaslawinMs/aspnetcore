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
|            **WarmRequest** | **MinimumAge10** | **156,036.9 ns** | **14,366.59 ns** |  **7,514.00 ns** |      **-** |     **-** |     **-** |  **15,540 B** |
| CachingDisabledRequest | MinimumAge10 | 145,578.6 ns | 23,409.03 ns | 12,243.38 ns |      - |     - |     - |  15,611 B |
|        DirectGetPolicy | MinimumAge10 |     137.4 ns |     17.49 ns |      9.15 ns | 0.0121 |     - |     - |     520 B |
|            **WarmRequest** | **MinimumAge50** |  **41,285.0 ns** |  **3,844.53 ns** |  **2,010.76 ns** | **0.4039** |     **-** |     **-** |  **15,643 B** |
| CachingDisabledRequest | MinimumAge50 |  41,179.2 ns |  3,357.10 ns |  1,755.83 ns | 0.3890 |     - |     - |  15,675 B |
|        DirectGetPolicy | MinimumAge50 |     130.3 ns |     16.60 ns |      8.68 ns | 0.0130 |     - |     - |     520 B |
