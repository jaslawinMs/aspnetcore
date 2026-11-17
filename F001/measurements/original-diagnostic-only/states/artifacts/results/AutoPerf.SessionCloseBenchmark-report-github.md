``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=original-diagnostic-only  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  InvocationCount=1  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  RunStrategy=Monitoring  
UnrollFactor=1  WarmupCount=3  

```
|       Method | Streams |     Mean |     Error |    StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------- |-------- |---------:|----------:|----------:|------:|------:|------:|----------:|
| CloseSession |       0 | 59.76 μs |  7.877 μs |  4.120 μs |     - |     - |     - |      3 KB |
| CloseSession |       1 | 80.66 μs | 38.303 μs | 20.033 μs |     - |     - |     - |      3 KB |
| CloseSession |      16 | 87.86 μs | 13.963 μs |  7.303 μs |     - |     - |     - |      4 KB |
