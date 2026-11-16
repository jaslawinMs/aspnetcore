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
| **ActualStateHasChangedAnalyzer** |          **Empty** |     **Serial** | **25.028 ms** | **7.3435 ms** | **3.8408 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualStateHasChangedAnalyzer** |          **Empty** | **Concurrent** | **11.170 ms** | **0.5543 ms** | **0.2899 ms** |        **-** |     **-** |     **-** |      **2 MB** |
| **ActualStateHasChangedAnalyzer** |  **LifecycleOnly** |     **Serial** | **35.447 ms** | **2.9761 ms** | **1.5566 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualStateHasChangedAnalyzer** |  **LifecycleOnly** | **Concurrent** | **10.295 ms** | **1.8874 ms** | **0.9872 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualStateHasChangedAnalyzer** |      **EventOnly** |     **Serial** | **27.438 ms** | **8.1555 ms** | **4.2655 ms** |        **-** |     **-** |     **-** |      **6 MB** |
| **ActualStateHasChangedAnalyzer** |      **EventOnly** | **Concurrent** |  **7.585 ms** | **1.5638 ms** | **0.8179 ms** |  **76.9231** |     **-** |     **-** |      **7 MB** |
| **ActualStateHasChangedAnalyzer** | **SmallPopulated** |     **Serial** |  **5.946 ms** | **0.9877 ms** | **0.5166 ms** |  **71.4286** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** | **SmallPopulated** | **Concurrent** |  **3.602 ms** | **0.2298 ms** | **0.1202 ms** |  **62.5000** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** |   **WidePartials** |     **Serial** | **13.208 ms** | **3.3243 ms** | **1.7387 ms** | **142.8571** |     **-** |     **-** |      **8 MB** |
| **ActualStateHasChangedAnalyzer** |   **WidePartials** | **Concurrent** | **16.737 ms** | **2.8158 ms** | **1.4727 ms** |        **-** |     **-** |     **-** |      **9 MB** |
