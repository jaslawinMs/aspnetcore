``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                     Method |       Workload |       Mode |     Mean |     Error |   StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------------- |--------------- |----------- |---------:|----------:|---------:|------:|------:|------:|----------:|
| **ActualRouteHandlerAnalyzer** |          **Empty** |     **Serial** | **37.36 ms** | **11.159 ms** | **5.836 ms** |     **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |          **Empty** | **Concurrent** | **22.00 ms** |  **3.868 ms** | **2.023 ms** |     **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** |     **Serial** | **20.35 ms** |  **2.198 ms** | **1.150 ms** |     **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** | **Concurrent** | **17.61 ms** |  **0.764 ms** | **0.400 ms** |     **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** |     **Serial** | **22.70 ms** |  **4.920 ms** | **2.573 ms** |     **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** | **Concurrent** | **10.95 ms** |  **1.922 ms** | **1.005 ms** |     **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** |     **Serial** | **69.34 ms** |  **8.593 ms** | **4.494 ms** |     **-** |     **-** |     **-** |      **8 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** | **Concurrent** | **36.92 ms** |  **6.863 ms** | **3.590 ms** |     **-** |     **-** |     **-** |     **12 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** |     **Serial** | **27.76 ms** |  **3.738 ms** | **1.955 ms** |     **-** |     **-** |     **-** |      **9 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** | **Concurrent** | **17.52 ms** |  **1.763 ms** | **0.922 ms** |     **-** |     **-** |     **-** |     **12 MB** |
