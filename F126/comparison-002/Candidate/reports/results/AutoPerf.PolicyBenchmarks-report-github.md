``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F126  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                 Method |      Profile |         Mean |        Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------------- |------------- |-------------:|-------------:|------------:|-------:|------:|------:|----------:|
|            **WarmRequest** | **MinimumAge10** | **153,351.1 ns** | **11,126.39 ns** | **5,819.32 ns** |      **-** |     **-** |     **-** |  **14,287 B** |
| CachingDisabledRequest | MinimumAge10 |  59,609.6 ns | 10,865.80 ns | 5,683.02 ns |      - |     - |     - |  15,664 B |
|        DirectGetPolicy | MinimumAge10 |     131.5 ns |      9.26 ns |     4.85 ns | 0.0130 |     - |     - |     520 B |
|            **WarmRequest** | **MinimumAge50** |  **40,318.7 ns** |  **5,120.47 ns** | **2,678.10 ns** | **0.3557** |     **-** |     **-** |  **14,323 B** |
| CachingDisabledRequest | MinimumAge50 |  41,838.2 ns |  4,633.10 ns | 2,423.20 ns | 0.4031 |     - |     - |  15,616 B |
|        DirectGetPolicy | MinimumAge50 |     134.3 ns |     19.59 ns |    10.25 ns | 0.0122 |     - |     - |     520 B |
