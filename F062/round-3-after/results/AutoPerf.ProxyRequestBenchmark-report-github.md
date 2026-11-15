``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                Method |               Recipe |       Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------- |--------------------- |-----------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **ProxyCompletedRequest** |            **EmptyHttp** | **298.990 μs** | **55.4087 μs** | **28.9798 μs** |      **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** |        **FactoryThrows** |   **5.605 μs** |  **2.9823 μs** |  **1.5598 μs** |      **-** |     **-** |     **-** |      **2 KB** |
| **ProxyCompletedRequest** |           **FaultedUri** |   **8.796 μs** |  **0.1869 μs** |  **0.0978 μs** | **0.0908** |     **-** |     **-** |      **4 KB** |
| **ProxyCompletedRequest** |              **Http200** | **211.833 μs** | **49.5384 μs** | **25.9095 μs** |      **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** | **Http2(...)quest [26]** | **160.374 μs** | **16.6938 μs** |  **8.7312 μs** |      **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** |              **Http404** | **173.496 μs** | **35.9887 μs** | **18.8228 μs** |      **-** |     **-** |     **-** |      **6 KB** |
