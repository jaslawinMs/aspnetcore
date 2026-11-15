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
| **ProxyCompletedRequest** |            **EmptyHttp** | **297.854 μs** | **30.5240 μs** | **15.9646 μs** |      **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** |        **FactoryThrows** |   **5.503 μs** |  **2.5716 μs** |  **1.3450 μs** |      **-** |     **-** |     **-** |      **2 KB** |
| **ProxyCompletedRequest** |           **FaultedUri** |   **8.842 μs** |  **0.6309 μs** |  **0.3300 μs** | **0.0862** |     **-** |     **-** |      **4 KB** |
| **ProxyCompletedRequest** |              **Http200** | **165.019 μs** | **22.2844 μs** | **11.6552 μs** |      **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** | **Http2(...)quest [26]** | **163.089 μs** | **16.5956 μs** |  **8.6798 μs** |      **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** |              **Http404** | **163.431 μs** | **18.8795 μs** |  **9.8743 μs** |      **-** |     **-** |     **-** |      **6 KB** |
