``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F030-OriginalDiagnostic  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|           Method |             Profile |     Mean |    Error |   StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |-------------------- |---------:|---------:|---------:|------:|------:|------:|----------:|
| **RenderAndConsume** |   **Async.Completed32** | **23.64 μs** | **4.711 μs** | **2.464 μs** |     **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Async.Completed4096** | **34.36 μs** | **1.204 μs** | **0.630 μs** |     **-** |     **-** |     **-** |     **45 KB** |
| **RenderAndConsume** |    **Sync.Completed32** | **12.14 μs** | **2.540 μs** | **1.329 μs** |     **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** |  **Sync.Completed4096** | **28.84 μs** | **6.306 μs** | **3.298 μs** |     **-** |     **-** |     **-** |     **45 KB** |
