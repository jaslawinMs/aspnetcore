``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|    Method |                 Case |     Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------- |--------------------- |---------:|----------:|---------:|-------:|------:|------:|----------:|
| **Construct** |    **Dictionary_Absent** | **617.8 ns** |  **32.46 ns** | **16.98 ns** | **0.0442** |     **-** |     **-** |   **1,880 B** |
| **Construct** |      **Dictionary_None** | **642.0 ns** |  **17.17 ns** |  **8.98 ns** | **0.0443** |     **-** |     **-** |   **1,880 B** |
| **Construct** |         **Fresh_Absent** | **640.6 ns** |  **49.03 ns** | **25.64 ns** | **0.0453** |     **-** |     **-** |   **1,880 B** |
| **Construct** |      **Fresh_Cancelled** | **676.7 ns** |  **41.16 ns** | **21.53 ns** | **0.0469** |     **-** |     **-** |   **1,880 B** |
| **Construct** |           **Fresh_None** | **665.3 ns** |  **29.01 ns** | **15.17 ns** | **0.0485** |     **-** |     **-** |   **1,880 B** |
| **Construct** |           **Fresh_Null** | **666.8 ns** |  **38.31 ns** | **20.04 ns** | **0.0463** |     **-** |     **-** |   **1,880 B** |
| **Construct** |         **Fresh_Object** | **695.5 ns** | **144.07 ns** | **75.35 ns** | **0.0463** |     **-** |     **-** |   **1,880 B** |
| **Construct** | **Lifet(...)bsent [22]** | **730.4 ns** | **111.54 ns** | **58.34 ns** | **0.0461** |     **-** |     **-** |   **1,904 B** |
| **Construct** |  **RequestOnly_Control** | **257.8 ns** |  **19.43 ns** | **10.16 ns** | **0.0259** |     **-** |     **-** |   **1,024 B** |
| **Construct** |       **Reused_Default** | **277.8 ns** |  **19.30 ns** | **10.09 ns** | **0.0137** |     **-** |     **-** |     **592 B** |
| **Construct** | **Reuse(...)y1024 [21]** | **269.6 ns** |  **24.28 ns** | **12.70 ns** | **0.0145** |     **-** |     **-** |     **592 B** |
| **Construct** |  **Reused_Dictionary32** | **264.7 ns** |  **19.70 ns** | **10.31 ns** | **0.0157** |     **-** |     **-** |     **592 B** |
