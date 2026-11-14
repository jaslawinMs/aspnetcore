``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|    Method |                 Case |     Mean |    Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------- |--------------------- |---------:|---------:|---------:|-------:|------:|------:|----------:|
| **Construct** |    **Dictionary_Absent** | **636.3 ns** | **28.82 ns** | **15.07 ns** | **0.0445** |     **-** |     **-** |   **1,880 B** |
| **Construct** |      **Dictionary_None** | **653.8 ns** | **41.80 ns** | **21.86 ns** | **0.0462** |     **-** |     **-** |   **1,856 B** |
| **Construct** |         **Fresh_Absent** | **644.5 ns** | **51.44 ns** | **26.91 ns** | **0.0457** |     **-** |     **-** |   **1,880 B** |
| **Construct** |      **Fresh_Cancelled** | **665.0 ns** | **35.92 ns** | **18.79 ns** | **0.0464** |     **-** |     **-** |   **1,856 B** |
| **Construct** |           **Fresh_None** | **675.7 ns** | **21.37 ns** | **11.18 ns** | **0.0481** |     **-** |     **-** |   **1,856 B** |
| **Construct** |           **Fresh_Null** | **672.2 ns** | **63.46 ns** | **33.19 ns** | **0.0461** |     **-** |     **-** |   **1,856 B** |
| **Construct** |         **Fresh_Object** | **661.1 ns** | **10.55 ns** |  **5.52 ns** | **0.0464** |     **-** |     **-** |   **1,856 B** |
| **Construct** | **Lifet(...)bsent [22]** | **721.1 ns** | **98.30 ns** | **51.41 ns** | **0.0501** |     **-** |     **-** |   **1,904 B** |
| **Construct** |  **RequestOnly_Control** | **258.0 ns** | **18.84 ns** |  **9.86 ns** | **0.0262** |     **-** |     **-** |   **1,024 B** |
| **Construct** |       **Reused_Default** | **265.7 ns** |  **5.16 ns** |  **2.70 ns** | **0.0134** |     **-** |     **-** |     **568 B** |
| **Construct** | **Reuse(...)y1024 [21]** | **255.6 ns** | **12.63 ns** |  **6.61 ns** | **0.0129** |     **-** |     **-** |     **568 B** |
| **Construct** |  **Reused_Dictionary32** | **260.0 ns** | **18.30 ns** |  **9.57 ns** | **0.0132** |     **-** |     **-** |     **568 B** |
