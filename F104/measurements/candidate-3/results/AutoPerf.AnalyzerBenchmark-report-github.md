``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                     Method |       Workload |       Mode |      Mean |     Error |    StdDev |    Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------------- |--------------- |----------- |----------:|----------:|----------:|---------:|------:|------:|----------:|
| **ActualRouteHandlerAnalyzer** |          **Empty** |     **Serial** | **28.425 ms** | **9.9284 ms** | **5.1928 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |          **Empty** | **Concurrent** | **24.120 ms** | **2.9651 ms** | **1.5508 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** |     **Serial** | **21.008 ms** | **1.7753 ms** | **0.9285 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** | **Concurrent** | **10.557 ms** | **0.6141 ms** | **0.3212 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** |     **Serial** | **14.144 ms** | **0.6484 ms** | **0.3391 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** | **Concurrent** |  **8.932 ms** | **0.4337 ms** | **0.2268 ms** | **100.0000** |     **-** |     **-** |      **4 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** |     **Serial** | **54.989 ms** | **2.5835 ms** | **1.3512 ms** |        **-** |     **-** |     **-** |      **8 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** | **Concurrent** | **26.497 ms** | **4.1042 ms** | **2.1466 ms** |        **-** |     **-** |     **-** |     **12 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** |     **Serial** | **22.213 ms** | **4.3004 ms** | **2.2492 ms** |        **-** |     **-** |     **-** |      **8 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** | **Concurrent** | **13.340 ms** | **1.3029 ms** | **0.6814 ms** | **166.6667** |     **-** |     **-** |     **13 MB** |
