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
| **ProxyCompletedRequest** |            **EmptyHttp** | **300.751 μs** | **38.5858 μs** | **20.1811 μs** |     **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** |        **FactoryThrows** |   **4.475 μs** |  **0.1331 μs** |  **0.0696 μs** |     **-** |     **-** |     **-** |      **2 KB** |
| **ProxyCompletedRequest** |           **FaultedUri** |   **8.562 μs** |  **0.1068 μs** |  **0.0559 μs** |     **-** |     **-** |     **-** |      **4 KB** |
| **ProxyCompletedRequest** |              **Http200** | **163.954 μs** | **23.8806 μs** | **12.4900 μs** |     **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** | **Http2(...)quest [26]** | **162.277 μs** | **21.3429 μs** | **11.1627 μs** |     **-** |     **-** |     **-** |      **6 KB** |
| **ProxyCompletedRequest** |              **Http404** | **165.450 μs** | **13.5902 μs** |  **7.1080 μs** |     **-** |     **-** |     **-** |      **6 KB** |
