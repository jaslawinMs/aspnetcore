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
| **CollectEntries** |         **Aligned_1** |      **83.744 ns** |     **2.4522 ns** |     **1.2825 ns** | **0.0026** |     **-** |     **-** |     **128 B** |
| **CollectEntries** |      **Aligned_1000** |  **12,626.401 ns** |   **570.1822 ns** |   **298.2163 ns** | **0.3735** |     **-** |     **-** |  **16,641 B** |
| **CollectEntries** |       **Aligned_128** |   **2,122.878 ns** |    **46.1775 ns** |    **24.1517 ns** | **0.1047** |     **-** |     **-** |   **4,304 B** |
| **CollectEntries** |        **Aligned_16** |     **365.595 ns** |    **30.4249 ns** |    **15.9128 ns** | **0.0141** |     **-** |     **-** |     **648 B** |
| **CollectEntries** |    **AllUnmatched_1** |     **105.156 ns** |     **6.0514 ns** |     **3.1650 ns** | **0.0043** |     **-** |     **-** |     **176 B** |
| **CollectEntries** | **AllUnmatched_1000** | **386,051.517 ns** | **3,586.2823 ns** | **1,875.6950 ns** |      **-** |     **-** |     **-** |  **16,700 B** |
| **CollectEntries** |  **AllUnmatched_128** |   **9,068.987 ns** |   **123.3683 ns** |    **64.5240 ns** | **0.0903** |     **-** |     **-** |   **4,352 B** |
| **CollectEntries** |   **AllUnmatched_16** |     **550.597 ns** |    **11.8296 ns** |     **6.1871 ns** | **0.0166** |     **-** |     **-** |     **696 B** |
| **CollectEntries** |           **Empty_0** |       **4.860 ns** |     **0.0836 ns** |     **0.0437 ns** |      **-** |     **-** |     **-** |         **-** |
| **CollectEntries** |        **Excluded_1** |      **21.853 ns** |     **2.6605 ns** |     **1.3915 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |     **Excluded_1000** |      **22.365 ns** |     **1.6910 ns** |     **0.8844 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |      **Excluded_128** |      **21.208 ns** |     **0.5920 ns** |     **0.3096 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |       **Excluded_16** |      **21.276 ns** |     **0.5672 ns** |     **0.2967 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **CollectEntries** |           **Mixed_1** |     **119.614 ns** |     **1.7736 ns** |     **0.9276 ns** | **0.0037** |     **-** |     **-** |     **176 B** |
| **CollectEntries** |        **Mixed_1000** | **376,411.443 ns** | **4,474.9177 ns** | **2,340.4685 ns** |      **-** |     **-** |     **-** |  **16,709 B** |
| **CollectEntries** |         **Mixed_128** |   **9,130.208 ns** |    **80.4219 ns** |    **42.0622 ns** | **0.0907** |     **-** |     **-** |   **4,353 B** |
| **CollectEntries** |          **Mixed_16** |     **573.049 ns** |    **38.0575 ns** |    **19.9048 ns** | **0.0171** |     **-** |     **-** |     **696 B** |
