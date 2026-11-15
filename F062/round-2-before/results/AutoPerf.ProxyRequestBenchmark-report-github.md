``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                Method |               Recipe |       Mean |      Error |     StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------- |--------------------- |-----------:|-----------:|-----------:|------:|------:|------:|----------:|
| **ProxyCompletedRequest** |            **EmptyHttp** | **306.185 μs** | **47.2260 μs** | **24.7001 μs** |     **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** |        **FactoryThrows** |   **4.381 μs** |  **0.1182 μs** |  **0.0618 μs** |     **-** |     **-** |     **-** |      **2 KB** |
| **ProxyCompletedRequest** |           **FaultedUri** |   **8.459 μs** |  **0.1483 μs** |  **0.0776 μs** |     **-** |     **-** |     **-** |      **4 KB** |
| **ProxyCompletedRequest** |              **Http200** | **237.263 μs** | **63.7765 μs** | **33.3564 μs** |     **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** | **Http2(...)quest [26]** | **177.549 μs** | **16.3424 μs** |  **8.5474 μs** |     **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** |              **Http404** | **170.830 μs** | **18.9661 μs** |  **9.9196 μs** |     **-** |     **-** |     **-** |      **6 KB** |
