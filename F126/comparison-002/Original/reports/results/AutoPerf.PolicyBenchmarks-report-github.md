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
|            **WarmRequest** | **MinimumAge10** | **162,637.0 ns** |  **5,753.52 ns** |  **3,009.20 ns** |      **-** |     **-** |     **-** |  **15,545 B** |
| CachingDisabledRequest | MinimumAge10 |  78,185.3 ns | 24,834.79 ns | 12,989.08 ns |      - |     - |     - |  15,645 B |
|        DirectGetPolicy | MinimumAge10 |     139.5 ns |     17.20 ns |      9.00 ns | 0.0130 |     - |     - |     520 B |
|            **WarmRequest** | **MinimumAge50** |  **41,754.0 ns** |  **2,761.86 ns** |  **1,444.51 ns** | **0.4063** |     **-** |     **-** |  **15,615 B** |
| CachingDisabledRequest | MinimumAge50 |  43,075.1 ns |  3,280.92 ns |  1,715.99 ns | 0.4088 |     - |     - |  15,618 B |
|        DirectGetPolicy | MinimumAge50 |     128.3 ns |      8.44 ns |      4.41 ns | 0.0121 |     - |     - |     520 B |
