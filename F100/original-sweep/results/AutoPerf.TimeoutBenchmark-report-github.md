``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                           Method |       Policy | Workload |       Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------------------- |------------- |--------- |-----------:|----------:|----------:|-------:|------:|------:|----------:|
| **ActualExplicitConstructorTimeout** |       **Finite** |   **Inline** | **1,555.2 ns** | **916.89 ns** | **479.55 ns** |      **-** |     **-** |     **-** |     **920 B** |
| **ActualExplicitConstructorTimeout** |       **Finite** | **Deferred** |   **955.3 ns** |  **11.57 ns** |   **6.05 ns** | **0.0188** |     **-** |     **-** |     **928 B** |
| **ActualExplicitConstructorTimeout** |       **Finite** | **Overlap8** | **7,722.1 ns** | **129.12 ns** |  **67.53 ns** | **0.1523** |     **-** |     **-** |   **7,768 B** |
| **ActualExplicitConstructorTimeout** |     **Infinite** |   **Inline** |   **730.2 ns** |  **11.75 ns** |   **6.14 ns** | **0.0143** |     **-** |     **-** |     **528 B** |
| **ActualExplicitConstructorTimeout** |     **Infinite** | **Deferred** |   **737.6 ns** |   **6.30 ns** |   **3.30 ns** | **0.0073** |     **-** |     **-** |     **528 B** |
| **ActualExplicitConstructorTimeout** |     **Infinite** | **Overlap8** | **6,083.8 ns** | **145.87 ns** |  **76.30 ns** | **0.1207** |     **-** |     **-** |   **4,568 B** |
| **ActualExplicitConstructorTimeout** | **ExplicitNone** |   **Inline** |   **747.2 ns** |  **83.03 ns** |  **43.42 ns** | **0.0072** |     **-** |     **-** |     **528 B** |
| **ActualExplicitConstructorTimeout** | **ExplicitNone** | **Deferred** |   **726.1 ns** |   **8.99 ns** |   **4.70 ns** | **0.0072** |     **-** |     **-** |     **528 B** |
| **ActualExplicitConstructorTimeout** | **ExplicitNone** | **Overlap8** | **6,067.1 ns** | **340.08 ns** | **177.87 ns** | **0.1189** |     **-** |     **-** |   **4,568 B** |
