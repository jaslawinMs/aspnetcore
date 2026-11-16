``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                        Method |       Workload |       Mode |      Mean |      Error |    StdDev |    Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------------------ |--------------- |----------- |----------:|-----------:|----------:|---------:|------:|------:|----------:|
| **ActualStateHasChangedAnalyzer** |          **Empty** |     **Serial** | **57.248 ms** | **13.5231 ms** | **7.0728 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** |          **Empty** | **Concurrent** | **15.625 ms** |  **1.0872 ms** | **0.5686 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** |  **LifecycleOnly** |     **Serial** | **83.577 ms** |  **7.2658 ms** | **3.8002 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualStateHasChangedAnalyzer** |  **LifecycleOnly** | **Concurrent** | **20.614 ms** |  **5.4841 ms** | **2.8683 ms** |        **-** |     **-** |     **-** |      **4 MB** |
| **ActualStateHasChangedAnalyzer** |      **EventOnly** |     **Serial** | **48.407 ms** |  **3.4621 ms** | **1.8108 ms** |        **-** |     **-** |     **-** |      **7 MB** |
| **ActualStateHasChangedAnalyzer** |      **EventOnly** | **Concurrent** |  **9.305 ms** |  **0.7180 ms** | **0.3755 ms** | **111.1111** |     **-** |     **-** |      **7 MB** |
| **ActualStateHasChangedAnalyzer** | **SmallPopulated** |     **Serial** |  **8.215 ms** |  **0.3947 ms** | **0.2064 ms** |        **-** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** | **SmallPopulated** | **Concurrent** |  **4.740 ms** |  **0.4528 ms** | **0.2368 ms** |  **52.6316** |     **-** |     **-** |      **3 MB** |
| **ActualStateHasChangedAnalyzer** |   **WidePartials** |     **Serial** | **18.802 ms** |  **1.9715 ms** | **1.0311 ms** |        **-** |     **-** |     **-** |      **8 MB** |
| **ActualStateHasChangedAnalyzer** |   **WidePartials** | **Concurrent** | **18.018 ms** |  **1.3656 ms** | **0.7142 ms** |        **-** |     **-** |     **-** |      **9 MB** |
