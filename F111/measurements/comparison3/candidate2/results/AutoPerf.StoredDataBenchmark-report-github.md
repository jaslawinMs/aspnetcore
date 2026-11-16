``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|          Method |              Case |          Mean |         Error |        StdDev |  Gen 0 |  Gen 1 |  Gen 2 | Allocated |
|---------------- |------------------ |--------------:|--------------:|--------------:|-------:|-------:|-------:|----------:|
| **SerializeOrSave** |       **DataAbove4K** |   **1,222.56 ns** |    **460.348 ns** |    **240.771 ns** | **0.1168** |      **-** |      **-** |   **4,352 B** |
| **SerializeOrSave** |      **DataArray256** |   **2,391.56 ns** |    **375.827 ns** |    **196.565 ns** | **0.0232** |      **-** |      **-** |   **1,272 B** |
| **SerializeOrSave** |     **DataAscii128K** |  **91,474.86 ns** |  **8,133.686 ns** |  **4,254.075 ns** | **1.9841** | **1.9841** | **1.9841** | **131,378 B** |
| **SerializeOrSave** |      **DataAscii16K** |   **3,377.14 ns** |    **532.673 ns** |    **278.598 ns** | **0.4257** |      **-** |      **-** |  **16,680 B** |
| **SerializeOrSave** |       **DataAscii1K** |     **480.42 ns** |    **111.727 ns** |     **58.435 ns** | **0.0335** |      **-** |      **-** |   **1,320 B** |
| **SerializeOrSave** |          **DataAt4K** |   **1,182.02 ns** |    **244.116 ns** |    **127.677 ns** | **0.1130** |      **-** |      **-** |   **4,344 B** |
| **SerializeOrSave** |       **DataBelow4K** |   **1,170.86 ns** |    **363.346 ns** |    **190.037 ns** | **0.1072** |      **-** |      **-** |   **4,344 B** |
| **SerializeOrSave** |         **DataEmpty** |      **74.91 ns** |     **14.246 ns** |      **7.451 ns** | **0.0050** |      **-** |      **-** |     **200 B** |
| **SerializeOrSave** |     **DataEntries16** |   **2,284.47 ns** |    **221.912 ns** |    **116.064 ns** | **0.0440** |      **-** |      **-** |   **1,664 B** |
| **SerializeOrSave** |    **DataEntries256** |  **34,280.68 ns** |  **3,045.183 ns** |  **1,592.689 ns** | **0.6443** |      **-** |      **-** |  **22,786 B** |
| **SerializeOrSave** |          **DataEnum** |   **2,418.68 ns** |     **31.604 ns** |     **16.530 ns** | **0.0254** |      **-** |      **-** |   **1,296 B** |
| **SerializeOrSave** |    **DataEscaped16K** | **118,143.89 ns** |  **1,593.634 ns** |    **833.501 ns** | **1.2019** |      **-** |      **-** |  **72,399 B** |
| **SerializeOrSave** |        **DataNested** |   **2,676.20 ns** |    **203.725 ns** |    **106.552 ns** | **0.0262** |      **-** |      **-** |   **1,448 B** |
| **SerializeOrSave** |          **DataNull** |     **111.20 ns** |     **12.970 ns** |      **6.784 ns** | **0.0061** |      **-** |      **-** |     **264 B** |
| **SerializeOrSave** |        **DataScalar** |     **798.69 ns** |     **21.610 ns** |     **11.302 ns** | **0.0085** |      **-** |      **-** |     **536 B** |
| **SerializeOrSave** |    **DataUnicode16K** | **139,848.11 ns** |  **9,280.704 ns** |  **4,853.988 ns** | **1.3021** | **1.3021** | **1.3021** |  **98,610 B** |
| **SerializeOrSave** |  **SessionAscii128K** | **142,225.42 ns** | **17,420.418 ns** |  **9,111.216 ns** | **2.7174** | **2.7174** | **2.7174** | **262,586 B** |
| **SerializeOrSave** |   **SessionAscii16K** |   **7,682.03 ns** |  **1,969.781 ns** |  **1,030.234 ns** | **0.8300** |      **-** |      **-** |  **33,217 B** |
| **SerializeOrSave** |      **SessionEmpty** |      **53.61 ns** |      **3.172 ns** |      **1.659 ns** | **0.0018** |      **-** |      **-** |      **80 B** |
| **SerializeOrSave** | **SessionEntries256** |  **35,999.89 ns** |    **816.030 ns** |    **426.800 ns** | **1.0776** |      **-** |      **-** |  **45,426 B** |
| **SerializeOrSave** | **SessionEscaped16K** | **128,848.34 ns** | **10,720.869 ns** |  **5,607.222 ns** | **3.7500** |      **-** |      **-** | **144,648 B** |
| **SerializeOrSave** |     **SessionNested** |   **3,036.41 ns** |     **67.851 ns** |     **35.488 ns** | **0.0296** |      **-** |      **-** |   **2,088 B** |
| **SerializeOrSave** |     **SessionScalar** |   **1,027.22 ns** |    **188.755 ns** |     **98.723 ns** | **0.0217** |      **-** |      **-** |     **928 B** |
| **SerializeOrSave** |     **ValueArray256** |   **3,397.17 ns** |    **413.571 ns** |    **216.305 ns** | **0.2233** |      **-** |      **-** |   **9,056 B** |
| **SerializeOrSave** |       **ValueNested** |   **3,311.77 ns** |    **263.216 ns** |    **137.667 ns** | **0.0870** |      **-** |      **-** |   **3,592 B** |
| **SerializeOrSave** |    **ValueString16K** |  **14,828.98 ns** |  **4,250.834 ns** |  **2,223.268 ns** | **3.2189** | **0.2682** |      **-** | **115,745 B** |
| **SerializeOrSave** |  **ValueStringSmall** |     **300.50 ns** |     **65.986 ns** |     **34.512 ns** | **0.0233** |      **-** |      **-** |     **888 B** |
| **SerializeOrSave** |   **ValueUnicode16K** | **300,941.55 ns** | **34,490.166 ns** | **18,039.024 ns** | **8.5227** | **8.5227** | **8.5227** | **492,604 B** |
