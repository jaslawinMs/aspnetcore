``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  InvocationCount=1  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
UnrollFactor=1  WarmupCount=3  

```
|          Method |               Recipe | CompletedRequests |      Mean |      Error |     StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |--------------------- |------------------ |----------:|-----------:|-----------:|------:|------:|------:|----------:|
| **StopApplication** |        **FactoryThrows** |                 **0** |  **4.588 μs** |  **1.5913 μs** |  **0.8323 μs** |     **-** |     **-** |     **-** |   **5,664 B** |
| **StopApplication** |        **FactoryThrows** |                 **1** |  **3.475 μs** |  **2.0485 μs** |  **1.0714 μs** |     **-** |     **-** |     **-** |     **360 B** |
| **StopApplication** |        **FactoryThrows** |                **32** |  **2.212 μs** |  **0.3222 μs** |  **0.1685 μs** |     **-** |     **-** |     **-** |   **2,688 B** |
| **StopApplication** |        **FactoryThrows** |              **1024** |  **3.612 μs** |  **1.9403 μs** |  **1.0148 μs** |     **-** |     **-** |     **-** |   **6,024 B** |
| **StopApplication** |           **FaultedUri** |                 **0** |  **2.750 μs** |  **1.6542 μs** |  **0.8652 μs** |     **-** |     **-** |     **-** |   **5,600 B** |
| **StopApplication** |           **FaultedUri** |                 **1** |  **3.400 μs** |  **1.7848 μs** |  **0.9335 μs** |     **-** |     **-** |     **-** |   **6,024 B** |
| **StopApplication** |           **FaultedUri** |                **32** |  **6.963 μs** |  **2.5813 μs** |  **1.3501 μs** |     **-** |     **-** |     **-** |   **5,688 B** |
| **StopApplication** |           **FaultedUri** |              **1024** | **50.650 μs** |  **5.9513 μs** |  **3.1126 μs** |     **-** |     **-** |     **-** |   **6,024 B** |
| **StopApplication** |              **Http200** |                 **0** |  **2.562 μs** |  **1.9091 μs** |  **0.9985 μs** |     **-** |     **-** |     **-** |   **5,664 B** |
| **StopApplication** |              **Http200** |                 **1** |  **2.913 μs** |  **1.8479 μs** |  **0.9665 μs** |     **-** |     **-** |     **-** |   **2,016 B** |
| **StopApplication** |              **Http200** |                **32** | **11.838 μs** |  **2.4097 μs** |  **1.2603 μs** |     **-** |     **-** |     **-** |      **24 B** |
| **StopApplication** |              **Http200** |              **1024** | **86.662 μs** | **31.7199 μs** | **16.5901 μs** |     **-** |     **-** |     **-** |         **-** |
| **StopApplication** | **Http2(...)quest [26]** |                 **0** |  **2.575 μs** |  **1.5355 μs** |  **0.8031 μs** |     **-** |     **-** |     **-** |   **6,024 B** |
| **StopApplication** | **Http2(...)quest [26]** |                 **1** |  **2.500 μs** |  **2.8359 μs** |  **1.4832 μs** |     **-** |     **-** |     **-** |   **2,976 B** |
| **StopApplication** | **Http2(...)quest [26]** |                **32** |  **8.213 μs** |  **4.1714 μs** |  **2.1817 μs** |     **-** |     **-** |     **-** |     **160 B** |
| **StopApplication** | **Http2(...)quest [26]** |              **1024** | **63.112 μs** | **12.3015 μs** |  **6.4339 μs** |     **-** |     **-** |     **-** |     **824 B** |
