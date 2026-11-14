``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|         Method |              Case |           Mean |         Error |        StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------- |------------------ |---------------:|--------------:|--------------:|-------:|------:|------:|----------:|
| **CollectEntries** |         **Aligned_1** |      **80.501 ns** |     **1.8158 ns** |     **0.9497 ns** | **0.0033** |     **-** |     **-** |     **128 B** |
| **CollectEntries** |      **Aligned_1000** |  **12,403.048 ns** |   **332.6853 ns** |   **174.0008 ns** | **0.3706** |     **-** |     **-** |  **16,641 B** |
| **CollectEntries** |       **Aligned_128** |   **1,941.440 ns** |   **167.5040 ns** |    **87.6078 ns** | **0.0997** |     **-** |     **-** |   **4,304 B** |
| **CollectEntries** |        **Aligned_16** |     **332.261 ns** |    **20.7551 ns** |    **10.8553 ns** | **0.0166** |     **-** |     **-** |     **648 B** |
| **CollectEntries** |    **AllUnmatched_1** |      **98.877 ns** |     **3.0929 ns** |     **1.6176 ns** | **0.0041** |     **-** |     **-** |     **176 B** |
| **CollectEntries** | **AllUnmatched_1000** | **384,788.603 ns** | **4,892.8661 ns** | **2,559.0636 ns** |      **-** |     **-** |     **-** |  **16,709 B** |
| **CollectEntries** |  **AllUnmatched_128** |   **8,983.725 ns** |   **116.1733 ns** |    **60.7609 ns** | **0.0889** |     **-** |     **-** |   **4,353 B** |
| **CollectEntries** |   **AllUnmatched_16** |     **521.299 ns** |    **13.0612 ns** |     **6.8313 ns** | **0.0158** |     **-** |     **-** |     **696 B** |
| **CollectEntries** |           **Empty_0** |       **5.184 ns** |     **0.1491 ns** |     **0.0780 ns** |      **-** |     **-** |     **-** |         **-** |
| **CollectEntries** |        **Excluded_1** |      **19.697 ns** |     **0.9479 ns** |     **0.4958 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |     **Excluded_1000** |      **19.317 ns** |     **0.4329 ns** |     **0.2264 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |      **Excluded_128** |      **19.267 ns** |     **0.6410 ns** |     **0.3353 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |       **Excluded_16** |      **19.448 ns** |     **0.6705 ns** |     **0.3507 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |           **Mixed_1** |     **114.823 ns** |     **3.0484 ns** |     **1.5943 ns** | **0.0036** |     **-** |     **-** |     **176 B** |
| **CollectEntries** |        **Mixed_1000** | **377,500.322 ns** | **4,210.8643 ns** | **2,202.3634 ns** |      **-** |     **-** |     **-** |  **16,709 B** |
| **CollectEntries** |         **Mixed_128** |   **8,951.553 ns** |   **118.4140 ns** |    **61.9328 ns** | **0.0902** |     **-** |     **-** |   **4,353 B** |
| **CollectEntries** |          **Mixed_16** |     **548.020 ns** |    **12.9396 ns** |     **6.7677 ns** | **0.0164** |     **-** |     **-** |     **696 B** |
