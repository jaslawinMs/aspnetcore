``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|         Method |              Case |          Mean |         Error |        StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------- |------------------ |--------------:|--------------:|--------------:|-------:|------:|------:|----------:|
| **CollectEntries** |         **Aligned_1** |     **88.351 ns** |     **1.4436 ns** |     **0.7550 ns** | **0.0028** |     **-** |     **-** |     **128 B** |
| **CollectEntries** |      **Aligned_1000** | **13,319.018 ns** |    **96.9828 ns** |    **50.7239 ns** | **0.3939** |     **-** |     **-** |  **16,641 B** |
| **CollectEntries** |       **Aligned_128** |  **2,151.845 ns** |    **71.0106 ns** |    **37.1399 ns** | **0.1107** |     **-** |     **-** |   **4,304 B** |
| **CollectEntries** |        **Aligned_16** |    **367.925 ns** |     **8.2585 ns** |     **4.3193 ns** | **0.0146** |     **-** |     **-** |     **648 B** |
| **CollectEntries** |    **AllUnmatched_1** |    **154.682 ns** |    **13.7313 ns** |     **7.1817 ns** | **0.0082** |     **-** |     **-** |     **352 B** |
| **CollectEntries** | **AllUnmatched_1000** | **40,092.251 ns** | **2,989.2481 ns** | **1,563.4346 ns** | **2.3292** |     **-** |     **-** |  **89,841 B** |
| **CollectEntries** |  **AllUnmatched_128** |  **4,775.662 ns** |   **216.4211 ns** |   **113.1924 ns** | **0.2918** |     **-** |     **-** |  **11,728 B** |
| **CollectEntries** |   **AllUnmatched_16** |    **735.595 ns** |    **37.7484 ns** |    **19.7432 ns** | **0.0354** |     **-** |     **-** |   **1,456 B** |
| **CollectEntries** |           **Empty_0** |      **4.514 ns** |     **0.0547 ns** |     **0.0286 ns** |      **-** |     **-** |     **-** |         **-** |
| **CollectEntries** |        **Excluded_1** |     **21.206 ns** |     **0.7269 ns** |     **0.3802 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |     **Excluded_1000** |     **21.231 ns** |     **0.2920 ns** |     **0.1527 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |      **Excluded_128** |     **21.177 ns** |     **0.2935 ns** |     **0.1535 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |       **Excluded_16** |     **20.839 ns** |     **0.4954 ns** |     **0.2591 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |           **Mixed_1** |    **206.491 ns** |    **18.5945 ns** |     **9.7253 ns** | **0.0104** |     **-** |     **-** |     **392 B** |
| **CollectEntries** |        **Mixed_1000** | **37,111.101 ns** | **1,725.4296 ns** |   **902.4330 ns** | **2.1802** |     **-** |     **-** |  **89,882 B** |
| **CollectEntries** |         **Mixed_128** |  **4,464.421 ns** |   **225.1086 ns** |   **117.7362 ns** | **0.3109** |     **-** |     **-** |  **11,768 B** |
| **CollectEntries** |          **Mixed_16** |    **768.148 ns** |    **33.1954 ns** |    **17.3618 ns** | **0.0388** |     **-** |     **-** |   **1,496 B** |
