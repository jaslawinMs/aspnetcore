``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  InvocationCount=1  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
UnrollFactor=1  WarmupCount=3  

```
|          Method |        Recipe | CompletedRequests |      Mean |      Error |     StdDev |    Median | Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |-------------- |------------------ |----------:|-----------:|-----------:|----------:|------:|------:|------:|----------:|
| **StopApplication** | **FactoryThrows** |                 **0** |  **3.013 μs** |  **1.5814 μs** |  **0.8271 μs** |  **2.700 μs** |     **-** |     **-** |     **-** |   **4,656 B** |
| **StopApplication** | **FactoryThrows** |                 **1** |  **2.562 μs** |  **1.3517 μs** |  **0.7070 μs** |  **2.500 μs** |     **-** |     **-** |     **-** |   **2,688 B** |
| **StopApplication** | **FactoryThrows** |                **32** |  **1.887 μs** |  **0.3950 μs** |  **0.2066 μs** |  **1.850 μs** |     **-** |     **-** |     **-** |         **-** |
| **StopApplication** | **FactoryThrows** |              **1024** |  **3.325 μs** |  **2.2663 μs** |  **1.1853 μs** |  **3.500 μs** |     **-** |     **-** |     **-** |   **2,640 B** |
| **StopApplication** |    **FaultedUri** |                 **0** |  **1.925 μs** |  **0.3649 μs** |  **0.1909 μs** |  **1.800 μs** |     **-** |     **-** |     **-** |   **6,000 B** |
| **StopApplication** |    **FaultedUri** |                 **1** |  **2.725 μs** |  **3.2136 μs** |  **1.6808 μs** |  **1.950 μs** |     **-** |     **-** |     **-** |   **6,024 B** |
| **StopApplication** |    **FaultedUri** |                **32** |  **7.050 μs** |  **3.5329 μs** |  **1.8478 μs** |  **7.250 μs** |     **-** |     **-** |     **-** |   **5,352 B** |
| **StopApplication** |    **FaultedUri** |              **1024** | **69.987 μs** | **13.1267 μs** |  **6.8655 μs** | **70.450 μs** |     **-** |     **-** |     **-** |   **6,000 B** |
| **StopApplication** |       **Http200** |                 **0** |  **2.575 μs** |  **1.1043 μs** |  **0.5776 μs** |  **2.450 μs** |     **-** |     **-** |     **-** |   **5,664 B** |
| **StopApplication** |       **Http200** |                 **1** |  **2.962 μs** |  **2.8229 μs** |  **1.4764 μs** |  **2.500 μs** |     **-** |     **-** |     **-** |         **-** |
| **StopApplication** |       **Http200** |                **32** |  **9.025 μs** |  **3.7797 μs** |  **1.9768 μs** |  **9.400 μs** |     **-** |     **-** |     **-** |      **24 B** |
| **StopApplication** |       **Http200** |              **1024** | **80.250 μs** | **30.7263 μs** | **16.0705 μs** | **72.900 μs** |     **-** |     **-** |     **-** |         **-** |
