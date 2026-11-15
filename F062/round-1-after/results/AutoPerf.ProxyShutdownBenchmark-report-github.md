``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  InvocationCount=1  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
UnrollFactor=1  WarmupCount=3  

```
|          Method |        Recipe | CompletedRequests |     Mean |     Error |    StdDev |   Median | Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |-------------- |------------------ |---------:|----------:|----------:|---------:|------:|------:|------:|----------:|
| **StopApplication** | **FactoryThrows** |                 **0** | **3.725 μs** |  **2.269 μs** | **1.1865 μs** | **4.050 μs** |     **-** |     **-** |     **-** |         **-** |
| **StopApplication** | **FactoryThrows** |                 **1** | **3.100 μs** |  **1.143 μs** | **0.5976 μs** | **3.000 μs** |     **-** |     **-** |     **-** |         **-** |
| **StopApplication** | **FactoryThrows** |                **32** | **2.788 μs** |  **1.224 μs** | **0.6402 μs** | **2.700 μs** |     **-** |     **-** |     **-** |     **696 B** |
| **StopApplication** | **FactoryThrows** |              **1024** | **3.550 μs** |  **1.987 μs** | **1.0392 μs** | **3.100 μs** |     **-** |     **-** |     **-** |   **4,056 B** |
| **StopApplication** |    **FaultedUri** |                 **0** | **3.263 μs** |  **2.168 μs** | **1.1338 μs** | **3.200 μs** |     **-** |     **-** |     **-** |         **-** |
| **StopApplication** |    **FaultedUri** |                 **1** | **3.250 μs** |  **2.237 μs** | **1.1699 μs** | **3.150 μs** |     **-** |     **-** |     **-** |         **-** |
| **StopApplication** |    **FaultedUri** |                **32** | **3.150 μs** |  **1.987 μs** | **1.0392 μs** | **2.850 μs** |     **-** |     **-** |     **-** |   **2,040 B** |
| **StopApplication** |    **FaultedUri** |              **1024** | **9.588 μs** |  **3.792 μs** | **1.9831 μs** | **9.400 μs** |     **-** |     **-** |     **-** |   **6,000 B** |
| **StopApplication** |       **Http200** |                 **0** | **3.700 μs** |  **2.134 μs** | **1.1161 μs** | **4.000 μs** |     **-** |     **-** |     **-** |   **3,984 B** |
| **StopApplication** |       **Http200** |                 **1** | **7.088 μs** | **18.820 μs** | **9.8433 μs** | **3.750 μs** |     **-** |     **-** |     **-** |         **-** |
| **StopApplication** |       **Http200** |                **32** | **2.913 μs** |  **2.439 μs** | **1.2755 μs** | **2.250 μs** |     **-** |     **-** |     **-** |   **2,688 B** |
| **StopApplication** |       **Http200** |              **1024** | **2.750 μs** |  **1.979 μs** | **1.0351 μs** | **2.200 μs** |     **-** |     **-** |     **-** |     **136 B** |
