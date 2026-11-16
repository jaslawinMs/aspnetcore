``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                        Method |       Workload |       Mode |      Mean |      Error |     StdDev |    Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------------------ |--------------- |----------- |----------:|-----------:|-----------:|---------:|------:|------:|----------:|
| **ActualStateHasChangedAnalyzer** |          **Empty** |     **Serial** | **66.318 ms** | **20.8437 ms** | **10.9017 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** |          **Empty** | **Concurrent** | **16.928 ms** |  **2.4993 ms** |  **1.3072 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** |  **LifecycleOnly** |     **Serial** | **86.473 ms** |  **7.4268 ms** |  **3.8844 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualStateHasChangedAnalyzer** |  **LifecycleOnly** | **Concurrent** | **15.474 ms** |  **2.8244 ms** |  **1.4772 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualStateHasChangedAnalyzer** |      **EventOnly** |     **Serial** | **48.615 ms** |  **6.3598 ms** |  **3.3263 ms** |        **-** |     **-** |     **-** |      **7 MB** |
| **ActualStateHasChangedAnalyzer** |      **EventOnly** | **Concurrent** | **10.612 ms** |  **1.9892 ms** |  **1.0404 ms** | **142.8571** |     **-** |     **-** |      **7 MB** |
| **ActualStateHasChangedAnalyzer** | **SmallPopulated** |     **Serial** |  **8.956 ms** |  **1.5292 ms** |  **0.7998 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** | **SmallPopulated** | **Concurrent** |  **4.769 ms** |  **0.3393 ms** |  **0.1775 ms** |  **50.0000** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** |   **WidePartials** |     **Serial** | **20.415 ms** |  **6.1683 ms** |  **3.2261 ms** |        **-** |     **-** |     **-** |      **8 MB** |
| **ActualStateHasChangedAnalyzer** |   **WidePartials** | **Concurrent** | **21.655 ms** |  **2.1801 ms** |  **1.1402 ms** |        **-** |     **-** |     **-** |      **9 MB** |
