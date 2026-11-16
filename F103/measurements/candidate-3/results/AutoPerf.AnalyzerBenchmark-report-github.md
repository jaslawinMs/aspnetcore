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
| **ActualStateHasChangedAnalyzer** |          **Empty** |     **Serial** | **22.660 ms** | **2.8137 ms** | **1.4716 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualStateHasChangedAnalyzer** |          **Empty** | **Concurrent** | **11.231 ms** | **1.2043 ms** | **0.6299 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** |  **LifecycleOnly** |     **Serial** | **42.995 ms** | **8.7729 ms** | **4.5884 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualStateHasChangedAnalyzer** |  **LifecycleOnly** | **Concurrent** | **12.744 ms** | **1.2607 ms** | **0.6594 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualStateHasChangedAnalyzer** |      **EventOnly** |     **Serial** | **36.715 ms** | **3.1905 ms** | **1.6687 ms** |        **-** |     **-** |     **-** |      **7 MB** |
| **ActualStateHasChangedAnalyzer** |      **EventOnly** | **Concurrent** |  **8.242 ms** | **0.5115 ms** | **0.2675 ms** | **100.0000** |     **-** |     **-** |      **7 MB** |
| **ActualStateHasChangedAnalyzer** | **SmallPopulated** |     **Serial** |  **6.119 ms** | **0.3197 ms** | **0.1672 ms** |  **76.9231** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** | **SmallPopulated** | **Concurrent** |  **3.874 ms** | **0.2917 ms** | **0.1526 ms** |  **41.6667** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** |   **WidePartials** |     **Serial** | **11.829 ms** | **0.5880 ms** | **0.3075 ms** | **142.8571** |     **-** |     **-** |      **8 MB** |
| **ActualStateHasChangedAnalyzer** |   **WidePartials** | **Concurrent** | **14.756 ms** | **0.7580 ms** | **0.3964 ms** | **166.6667** |     **-** |     **-** |      **9 MB** |
