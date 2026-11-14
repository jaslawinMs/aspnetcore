``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|         Method |              Case |          Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------- |------------------ |--------------:|------------:|------------:|-------:|------:|------:|----------:|
| **CollectEntries** |         **Aligned_1** |     **84.648 ns** |   **8.2977 ns** |   **4.3399 ns** | **0.0034** |     **-** |     **-** |     **128 B** |
| **CollectEntries** |      **Aligned_1000** | **12,353.311 ns** | **414.5214 ns** | **216.8027 ns** | **0.3620** |     **-** |     **-** |  **16,641 B** |
| **CollectEntries** |       **Aligned_128** |  **2,120.812 ns** |  **46.1687 ns** |  **24.1471 ns** | **0.1068** |     **-** |     **-** |   **4,304 B** |
| **CollectEntries** |        **Aligned_16** |    **336.863 ns** |  **10.4795 ns** |   **5.4810 ns** | **0.0147** |     **-** |     **-** |     **648 B** |
| **CollectEntries** |    **AllUnmatched_1** |    **103.300 ns** |   **4.2051 ns** |   **2.1993 ns** | **0.0043** |     **-** |     **-** |     **176 B** |
| **CollectEntries** | **AllUnmatched_1000** | **16,717.370 ns** | **279.2026 ns** | **146.0284 ns** | **0.3289** |     **-** |     **-** |  **16,688 B** |
| **CollectEntries** |  **AllUnmatched_128** |  **2,773.667 ns** | **240.7910 ns** | **125.9384 ns** | **0.1026** |     **-** |     **-** |   **4,352 B** |
| **CollectEntries** |   **AllUnmatched_16** |    **458.386 ns** |  **14.5595 ns** |   **7.6149 ns** | **0.0164** |     **-** |     **-** |     **696 B** |
| **CollectEntries** |           **Empty_0** |      **4.845 ns** |   **0.1352 ns** |   **0.0707 ns** |      **-** |     **-** |     **-** |         **-** |
| **CollectEntries** |        **Excluded_1** |     **21.932 ns** |   **2.0002 ns** |   **1.0461 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |     **Excluded_1000** |     **20.580 ns** |   **1.0971 ns** |   **0.5738 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |      **Excluded_128** |     **20.784 ns** |   **0.4657 ns** |   **0.2436 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |       **Excluded_16** |     **20.393 ns** |   **0.4436 ns** |   **0.2320 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |           **Mixed_1** |    **120.549 ns** |   **6.3158 ns** |   **3.3033 ns** | **0.0037** |     **-** |     **-** |     **176 B** |
| **CollectEntries** |        **Mixed_1000** | **18,726.430 ns** | **277.9712 ns** | **145.3843 ns** | **0.3720** |     **-** |     **-** |  **16,689 B** |
| **CollectEntries** |         **Mixed_128** |  **2,992.160 ns** | **159.0200 ns** |  **83.1705 ns** | **0.1138** |     **-** |     **-** |   **4,352 B** |
| **CollectEntries** |          **Mixed_16** |    **504.579 ns** |  **14.9656 ns** |   **7.8273 ns** | **0.0147** |     **-** |     **-** |     **696 B** |
