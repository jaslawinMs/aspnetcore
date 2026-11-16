``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                    Method |       Policy | Workload |       Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------------------- |------------- |--------- |-----------:|------------:|------------:|-------:|------:|------:|----------:|
| **ActualExplicitVoidTimeout** |       **Finite** |   **Inline** | **2,878.1 ns** | **2,213.09 ns** | **1,157.49 ns** |      **-** |     **-** |     **-** |     **840 B** |
| **ActualExplicitVoidTimeout** |       **Finite** | **Deferred** | **1,012.3 ns** |    **75.22 ns** |    **39.34 ns** | **0.0193** |     **-** |     **-** |     **992 B** |
| **ActualExplicitVoidTimeout** |       **Finite** | **Overlap8** | **8,083.5 ns** |   **804.20 ns** |   **420.61 ns** | **0.1539** |     **-** |     **-** |   **8,280 B** |
| **ActualExplicitVoidTimeout** |     **Infinite** |   **Inline** |   **626.2 ns** |    **20.47 ns** |    **10.70 ns** | **0.0062** |     **-** |     **-** |     **440 B** |
| **ActualExplicitVoidTimeout** |     **Infinite** | **Deferred** |   **796.0 ns** |    **29.41 ns** |    **15.38 ns** | **0.0157** |     **-** |     **-** |     **592 B** |
| **ActualExplicitVoidTimeout** |     **Infinite** | **Overlap8** | **6,188.6 ns** |   **206.79 ns** |   **108.16 ns** | **0.1200** |     **-** |     **-** |   **5,080 B** |
| **ActualExplicitVoidTimeout** | **ExplicitNone** |   **Inline** |   **626.7 ns** |     **9.43 ns** |     **4.93 ns** | **0.0063** |     **-** |     **-** |     **440 B** |
| **ActualExplicitVoidTimeout** | **ExplicitNone** | **Deferred** |   **761.8 ns** |    **20.85 ns** |    **10.91 ns** | **0.0153** |     **-** |     **-** |     **584 B** |
| **ActualExplicitVoidTimeout** | **ExplicitNone** | **Overlap8** | **6,089.7 ns** |   **139.75 ns** |    **73.09 ns** | **0.1205** |     **-** |     **-** |   **5,016 B** |
