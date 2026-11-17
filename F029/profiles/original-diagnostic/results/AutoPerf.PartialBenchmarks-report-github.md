``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F029-OriginalDiagnostic  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|           Method |             Profile |     Mean |     Error |   StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |-------------------- |---------:|----------:|---------:|------:|------:|------:|----------:|
| **RenderAndConsume** |   **Async.Completed32** | **19.22 μs** |  **2.901 μs** | **1.517 μs** |     **-** |     **-** |     **-** |     **12 KB** |
| **RenderAndConsume** | **Async.Completed4096** | **23.07 μs** | **14.662 μs** | **7.668 μs** |     **-** |     **-** |     **-** |     **43 KB** |
| **RenderAndConsume** |    **Sync.Completed32** | **10.81 μs** |  **2.964 μs** | **1.550 μs** |     **-** |     **-** |     **-** |     **12 KB** |
| **RenderAndConsume** |  **Sync.Completed4096** | **20.09 μs** | **10.707 μs** | **5.600 μs** |     **-** |     **-** |     **-** |     **43 KB** |
