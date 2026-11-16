``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                     Method |       Workload |       Mode |     Mean |    Error |   StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------------- |--------------- |----------- |---------:|---------:|---------:|------:|------:|------:|----------:|
| **ActualRouteHandlerAnalyzer** |          **Empty** |     **Serial** | **26.45 ms** | **1.475 ms** | **0.772 ms** |     **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |          **Empty** | **Concurrent** | **23.80 ms** | **2.258 ms** | **1.181 ms** |     **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** |     **Serial** | **21.51 ms** | **1.396 ms** | **0.730 ms** |     **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** | **Concurrent** | **17.40 ms** | **1.088 ms** | **0.569 ms** |     **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** |     **Serial** | **17.49 ms** | **2.035 ms** | **1.064 ms** |     **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** | **Concurrent** | **10.13 ms** | **0.846 ms** | **0.442 ms** |     **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** |     **Serial** | **62.20 ms** | **9.351 ms** | **4.891 ms** |     **-** |     **-** |     **-** |      **8 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** | **Concurrent** | **38.18 ms** | **5.526 ms** | **2.890 ms** |     **-** |     **-** |     **-** |     **12 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** |     **Serial** | **28.93 ms** | **6.218 ms** | **3.252 ms** |     **-** |     **-** |     **-** |      **9 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** | **Concurrent** | **16.23 ms** | **1.438 ms** | **0.752 ms** |     **-** |     **-** |     **-** |     **13 MB** |
