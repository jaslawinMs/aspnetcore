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
|            **WarmRequest** | **MinimumAge10** | **159,252.0 ns** | **22,596.36 ns** | **11,818.33 ns** |      **-** |     **-** |     **-** |  **14,283 B** |
| CachingDisabledRequest | MinimumAge10 | 138,621.7 ns | 25,283.95 ns | 13,223.99 ns |      - |     - |     - |  15,630 B |
|        DirectGetPolicy | MinimumAge10 |     128.5 ns |      8.65 ns |      4.53 ns | 0.0098 |     - |     - |     520 B |
|            **WarmRequest** | **MinimumAge50** |  **41,103.4 ns** |  **6,092.89 ns** |  **3,186.70 ns** | **0.3785** |     **-** |     **-** |  **14,330 B** |
| CachingDisabledRequest | MinimumAge50 |  41,333.7 ns |  2,415.88 ns |  1,263.55 ns |      - |     - |     - |  15,586 B |
|        DirectGetPolicy | MinimumAge50 |     129.6 ns |      8.08 ns |      4.23 ns | 0.0121 |     - |     - |     520 B |
