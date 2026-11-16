``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                        Method |       Workload |       Mode |      Mean |     Error |    StdDev |    Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------------------ |--------------- |----------- |----------:|----------:|----------:|---------:|------:|------:|----------:|
| **ActualStateHasChangedAnalyzer** |          **Empty** |     **Serial** | **24.161 ms** | **4.1156 ms** | **2.1525 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualStateHasChangedAnalyzer** |          **Empty** | **Concurrent** | **11.465 ms** | **1.9452 ms** | **1.0174 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualStateHasChangedAnalyzer** |  **LifecycleOnly** |     **Serial** | **48.478 ms** | **3.9986 ms** | **2.0913 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualStateHasChangedAnalyzer** |  **LifecycleOnly** | **Concurrent** | **19.332 ms** | **2.2664 ms** | **1.1854 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualStateHasChangedAnalyzer** |      **EventOnly** |     **Serial** | **41.640 ms** | **7.5922 ms** | **3.9709 ms** |        **-** |     **-** |     **-** |      **7 MB** |
| **ActualStateHasChangedAnalyzer** |      **EventOnly** | **Concurrent** |  **9.745 ms** | **0.7751 ms** | **0.4054 ms** | **111.1111** |     **-** |     **-** |      **7 MB** |
| **ActualStateHasChangedAnalyzer** | **SmallPopulated** |     **Serial** |  **6.773 ms** | **0.9027 ms** | **0.4721 ms** |  **90.9091** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** | **SmallPopulated** | **Concurrent** |  **4.486 ms** | **0.3241 ms** | **0.1695 ms** |  **52.6316** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** |   **WidePartials** |     **Serial** | **13.437 ms** | **1.6139 ms** | **0.8441 ms** | **166.6667** |     **-** |     **-** |      **8 MB** |
| **ActualStateHasChangedAnalyzer** |   **WidePartials** | **Concurrent** | **15.529 ms** | **1.8406 ms** | **0.9627 ms** |        **-** |     **-** |     **-** |      **9 MB** |
