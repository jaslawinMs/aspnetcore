``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                Method |       Policy | Workload |       Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------- |------------- |--------- |-----------:|----------:|----------:|-------:|------:|------:|----------:|
| **ActualExplicitTimeout** |       **Finite** |   **Inline** |   **805.3 ns** |  **27.63 ns** |  **14.45 ns** | **0.0156** |     **-** |     **-** |     **864 B** |
| **ActualExplicitTimeout** |       **Finite** | **Deferred** |   **919.8 ns** |  **27.44 ns** |  **14.35 ns** | **0.0188** |     **-** |     **-** |   **1,016 B** |
| **ActualExplicitTimeout** |       **Finite** | **Overlap8** | **7,409.2 ns** | **196.42 ns** | **102.73 ns** | **0.2170** |     **-** |     **-** |   **8,472 B** |
| **ActualExplicitTimeout** |     **Infinite** |   **Inline** |   **608.8 ns** |  **12.05 ns** |   **6.30 ns** | **0.0120** |     **-** |     **-** |     **464 B** |
| **ActualExplicitTimeout** |     **Infinite** | **Deferred** |   **730.2 ns** |  **10.62 ns** |   **5.55 ns** | **0.0146** |     **-** |     **-** |     **616 B** |
| **ActualExplicitTimeout** |     **Infinite** | **Overlap8** | **5,728.5 ns** | **132.35 ns** |  **69.22 ns** | **0.1116** |     **-** |     **-** |   **5,272 B** |
| **ActualExplicitTimeout** | **ExplicitNone** |   **Inline** |   **586.5 ns** |   **7.97 ns** |   **4.17 ns** | **0.0118** |     **-** |     **-** |     **464 B** |
| **ActualExplicitTimeout** | **ExplicitNone** | **Deferred** |   **612.5 ns** |  **60.04 ns** |  **31.40 ns** | **0.0117** |     **-** |     **-** |     **464 B** |
| **ActualExplicitTimeout** | **ExplicitNone** | **Overlap8** | **4,854.7 ns** | **104.62 ns** |  **54.72 ns** | **0.0960** |     **-** |     **-** |   **4,056 B** |
