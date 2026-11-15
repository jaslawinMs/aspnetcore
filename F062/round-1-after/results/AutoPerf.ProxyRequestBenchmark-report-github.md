``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                Method |               Recipe |         Mean |      Error |     StdDev |   Gen 0 |   Gen 1 |   Gen 2 | Allocated |
|---------------------- |--------------------- |-------------:|-----------:|-----------:|--------:|--------:|--------:|----------:|
| **ProxyCompletedRequest** |            **EmptyHttp** |   **295.686 μs** |  **42.920 μs** |  **22.448 μs** |       **-** |       **-** |       **-** |      **6 KB** |
| **ProxyCompletedRequest** |        **FactoryThrows** |     **5.575 μs** |   **2.564 μs** |   **1.341 μs** |       **-** |       **-** |       **-** |      **2 KB** |
| **ProxyCompletedRequest** |           **FaultedUri** | **2,763.279 μs** | **433.605 μs** | **226.784 μs** | **41.6667** | **41.6667** | **41.6667** |  **6,147 KB** |
| **ProxyCompletedRequest** |              **Http200** |   **213.228 μs** |  **40.947 μs** |  **21.416 μs** |       **-** |       **-** |       **-** |      **6 KB** |
| **ProxyCompletedRequest** | **Http2(...)quest [26]** |   **180.533 μs** |  **29.524 μs** |  **15.442 μs** |       **-** |       **-** |       **-** |      **6 KB** |
| **ProxyCompletedRequest** |              **Http404** |   **178.253 μs** |  **26.427 μs** |  **13.822 μs** |       **-** |       **-** |       **-** |      **6 KB** |
