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
|          Method |     Scenario |      Mean |     Error |   StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |------------- |----------:|----------:|---------:|------:|------:|------:|----------:|
| TryRemoveStream |      Missing |  7.350 μs |  3.371 μs | 1.763 μs |     - |     - |     - |   1,968 B |
| TryRemoveStream |     InputOne | 29.212 μs | 18.329 μs | 9.587 μs |     - |     - |     - |   2,352 B |
| TryRemoveStream | InputSixteen | 24.663 μs |  7.525 μs | 3.936 μs |     - |     - |     - |      24 B |
| TryRemoveStream |    OutputOne | 24.950 μs |  6.932 μs | 3.626 μs |     - |     - |     - |   2,448 B |
