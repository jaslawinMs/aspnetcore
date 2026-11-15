``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                Method |               Recipe |         Mean |       Error |      StdDev |   Gen 0 |   Gen 1 |   Gen 2 | Allocated |
|---------------------- |--------------------- |-------------:|------------:|------------:|--------:|--------:|--------:|----------:|
| **ProxyCompletedRequest** |            **EmptyHttp** |   **310.443 μs** |  **43.3781 μs** |  **22.6876 μs** |       **-** |       **-** |       **-** |      **6 KB** |
| **ProxyCompletedRequest** |        **FactoryThrows** |     **7.477 μs** |   **0.3382 μs** |   **0.1769 μs** |       **-** |       **-** |       **-** |      **2 KB** |
| **ProxyCompletedRequest** |           **FaultedUri** | **2,294.508 μs** | **322.0388 μs** | **168.4325 μs** | **41.6667** | **41.6667** | **41.6667** |  **6,147 KB** |
| **ProxyCompletedRequest** |              **Http200** |   **171.317 μs** |  **41.1976 μs** |  **21.5471 μs** |       **-** |       **-** |       **-** |      **6 KB** |
| **ProxyCompletedRequest** | **Http2(...)quest [26]** |   **161.606 μs** |  **14.4858 μs** |   **7.5764 μs** |       **-** |       **-** |       **-** |      **6 KB** |
| **ProxyCompletedRequest** |              **Http404** |   **160.696 μs** |  **21.1787 μs** |  **11.0768 μs** |       **-** |       **-** |       **-** |      **6 KB** |
