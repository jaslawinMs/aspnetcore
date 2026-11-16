``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                             Method |       Policy | Workload |       Mean |       Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------------------------- |------------- |--------- |-----------:|------------:|----------:|-------:|------:|------:|----------:|
| **ActualExplicitPropertyWriteTimeout** |       **Finite** |   **Inline** | **1,533.1 ns** | **1,346.69 ns** | **704.35 ns** |      **-** |     **-** |     **-** |     **856 B** |
| **ActualExplicitPropertyWriteTimeout** |       **Finite** | **Deferred** |   **914.0 ns** |     **7.73 ns** |   **4.04 ns** | **0.0181** |     **-** |     **-** |     **992 B** |
| **ActualExplicitPropertyWriteTimeout** |       **Finite** | **Overlap8** | **7,484.6 ns** |   **229.96 ns** | **120.27 ns** | **0.2219** |     **-** |     **-** |   **8,280 B** |
| **ActualExplicitPropertyWriteTimeout** |     **Infinite** |   **Inline** |   **579.8 ns** |     **8.56 ns** |   **4.48 ns** | **0.0115** |     **-** |     **-** |     **456 B** |
| **ActualExplicitPropertyWriteTimeout** |     **Infinite** | **Deferred** |   **707.6 ns** |     **9.55 ns** |   **4.99 ns** | **0.0139** |     **-** |     **-** |     **592 B** |
| **ActualExplicitPropertyWriteTimeout** |     **Infinite** | **Overlap8** | **5,692.6 ns** |    **63.03 ns** |  **32.97 ns** | **0.1120** |     **-** |     **-** |   **5,080 B** |
| **ActualExplicitPropertyWriteTimeout** | **ExplicitNone** |   **Inline** |   **581.3 ns** |    **33.66 ns** |  **17.60 ns** | **0.0112** |     **-** |     **-** |     **456 B** |
| **ActualExplicitPropertyWriteTimeout** | **ExplicitNone** | **Deferred** |   **704.5 ns** |     **9.61 ns** |   **5.02 ns** | **0.0138** |     **-** |     **-** |     **592 B** |
| **ActualExplicitPropertyWriteTimeout** | **ExplicitNone** | **Overlap8** | **5,646.0 ns** |    **84.33 ns** |  **44.10 ns** | **0.1108** |     **-** |     **-** |   **5,080 B** |
