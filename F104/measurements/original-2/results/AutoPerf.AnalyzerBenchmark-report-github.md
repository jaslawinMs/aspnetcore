``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                     Method |       Workload |       Mode |      Mean |      Error |    StdDev |    Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------------- |--------------- |----------- |----------:|-----------:|----------:|---------:|------:|------:|----------:|
| **ActualRouteHandlerAnalyzer** |          **Empty** |     **Serial** | **30.735 ms** | **10.7049 ms** | **5.5989 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |          **Empty** | **Concurrent** | **23.908 ms** |  **0.9207 ms** | **0.4815 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** |     **Serial** | **21.567 ms** |  **1.7682 ms** | **0.9248 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** | **Concurrent** | **10.195 ms** |  **0.9688 ms** | **0.5067 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** |     **Serial** | **14.480 ms** |  **0.7856 ms** | **0.4109 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** | **Concurrent** |  **9.101 ms** |  **0.7155 ms** | **0.3742 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** |     **Serial** | **55.388 ms** |  **1.8467 ms** | **0.9658 ms** |        **-** |     **-** |     **-** |      **8 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** | **Concurrent** | **25.179 ms** |  **4.0596 ms** | **2.1233 ms** |        **-** |     **-** |     **-** |     **12 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** |     **Serial** | **20.837 ms** |  **4.7250 ms** | **2.4713 ms** | **250.0000** |     **-** |     **-** |      **9 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** | **Concurrent** | **13.860 ms** |  **1.8733 ms** | **0.9798 ms** |        **-** |     **-** |     **-** |     **12 MB** |
