``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                            Method |       Policy | Workload |       Mean |       Error |    StdDev |     Median |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------------------- |------------- |--------- |-----------:|------------:|----------:|-----------:|-------:|------:|------:|----------:|
| **ActualExplicitPropertyReadTimeout** |       **Finite** |   **Inline** | **1,340.2 ns** | **1,512.76 ns** | **791.20 ns** |   **977.9 ns** |      **-** |     **-** |     **-** |     **784 B** |
| **ActualExplicitPropertyReadTimeout** |       **Finite** | **Deferred** |   **651.1 ns** |    **10.96 ns** |   **5.73 ns** |   **650.2 ns** | **0.0195** |     **-** |     **-** |     **792 B** |
| **ActualExplicitPropertyReadTimeout** |       **Finite** | **Overlap8** | **5,184.4 ns** |    **59.58 ns** |  **31.16 ns** | **5,169.8 ns** | **0.1550** |     **-** |     **-** |   **6,680 B** |
| **ActualExplicitPropertyReadTimeout** |     **Infinite** |   **Inline** |   **439.1 ns** |    **38.33 ns** |  **20.05 ns** |   **432.5 ns** | **0.0088** |     **-** |     **-** |     **392 B** |
| **ActualExplicitPropertyReadTimeout** |     **Infinite** | **Deferred** |   **445.3 ns** |    **15.80 ns** |   **8.26 ns** |   **443.1 ns** | **0.0086** |     **-** |     **-** |     **392 B** |
| **ActualExplicitPropertyReadTimeout** |     **Infinite** | **Overlap8** | **3,676.1 ns** |    **42.64 ns** |  **22.30 ns** | **3,677.6 ns** | **0.0723** |     **-** |     **-** |   **3,480 B** |
| **ActualExplicitPropertyReadTimeout** | **ExplicitNone** |   **Inline** |   **455.4 ns** |    **37.94 ns** |  **19.85 ns** |   **464.5 ns** | **0.0085** |     **-** |     **-** |     **392 B** |
| **ActualExplicitPropertyReadTimeout** | **ExplicitNone** | **Deferred** |   **440.4 ns** |     **7.14 ns** |   **3.73 ns** |   **439.5 ns** | **0.0087** |     **-** |     **-** |     **392 B** |
| **ActualExplicitPropertyReadTimeout** | **ExplicitNone** | **Overlap8** | **3,663.2 ns** |    **53.29 ns** |  **27.87 ns** | **3,654.2 ns** | **0.0730** |     **-** |     **-** |   **3,480 B** |
