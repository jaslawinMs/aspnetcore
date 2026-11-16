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
| **ActualRouteHandlerAnalyzer** |          **Empty** |     **Serial** | **28.108 ms** | **9.6267 ms** | **5.0350 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |          **Empty** | **Concurrent** | **23.944 ms** | **2.2940 ms** | **1.1998 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** |     **Serial** | **20.720 ms** | **1.6103 ms** | **0.8422 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** |    **SmallUnique** | **Concurrent** | **10.149 ms** | **1.1826 ms** | **0.6185 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** |     **Serial** | **14.178 ms** | **0.8981 ms** | **0.4697 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualRouteHandlerAnalyzer** | **SmallDuplicate** | **Concurrent** |  **9.055 ms** | **0.7506 ms** | **0.3926 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** |     **Serial** | **55.803 ms** | **3.8047 ms** | **1.9900 ms** |        **-** |     **-** |     **-** |      **8 MB** |
| **ActualRouteHandlerAnalyzer** |     **WideUnique** | **Concurrent** | **28.374 ms** | **4.8238 ms** | **2.5229 ms** |        **-** |     **-** |     **-** |     **12 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** |     **Serial** | **22.864 ms** | **2.9197 ms** | **1.5271 ms** |        **-** |     **-** |     **-** |      **9 MB** |
| **ActualRouteHandlerAnalyzer** |  **WideDuplicate** | **Concurrent** | **13.633 ms** | **1.2839 ms** | **0.6715 ms** | **166.6667** |     **-** |     **-** |     **12 MB** |
