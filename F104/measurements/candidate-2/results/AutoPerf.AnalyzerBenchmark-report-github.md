``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                     Method |       Workload |       Mode |     Mean |     Error |   StdDev |    Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------------- |--------------- |----------- |---------:|----------:|---------:|---------:|------:|------:|----------:|
| **ActualRouteHandlerAnalyzer** |          **Empty** |     **Serial** | **36.74 ms** |  **2.913 ms** | **1.523 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |          **Empty** | **Concurrent** | **22.97 ms** |  **2.720 ms** | **1.423 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** |     **Serial** | **20.40 ms** |  **1.411 ms** | **0.738 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** | **Concurrent** | **17.41 ms** |  **1.290 ms** | **0.675 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** |     **Serial** | **17.41 ms** |  **1.441 ms** | **0.754 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** | **Concurrent** | **10.25 ms** |  **0.961 ms** | **0.503 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** |     **Serial** | **65.46 ms** | **13.780 ms** | **7.207 ms** |        **-** |     **-** |     **-** |      **8 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** | **Concurrent** | **38.76 ms** |  **6.042 ms** | **3.160 ms** |        **-** |     **-** |     **-** |     **12 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** |     **Serial** | **30.94 ms** |  **1.426 ms** | **0.746 ms** |        **-** |     **-** |     **-** |      **9 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** | **Concurrent** | **17.95 ms** |  **2.163 ms** | **1.131 ms** | **250.0000** |     **-** |     **-** |     **13 MB** |
