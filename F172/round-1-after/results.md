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
| **Construct** |    **Dictionary_Absent** | **638.7 ns** | **42.40 ns** | **22.18 ns** | **0.0445** |     **-** |     **-** |   **1,880 B** |
| **Construct** |    **Dictionary_Custom** | **649.0 ns** | **62.30 ns** | **32.58 ns** | **0.0460** |     **-** |     **-** |   **1,880 B** |
| **Construct** |         **Fresh_Absent** | **637.3 ns** | **19.36 ns** | **10.13 ns** | **0.0444** |     **-** |     **-** |   **1,880 B** |
| **Construct** |         **Fresh_Custom** | **702.5 ns** | **65.56 ns** | **34.29 ns** | **0.0474** |     **-** |     **-** |   **1,880 B** |
| **Construct** |        **Fresh_Default** | **679.1 ns** | **67.92 ns** | **35.52 ns** | **0.0466** |     **-** |     **-** |   **1,880 B** |
| **Construct** |          **Fresh_Empty** | **679.8 ns** | **62.00 ns** | **32.43 ns** | **0.0463** |     **-** |     **-** |   **1,880 B** |
| **Construct** |           **Fresh_Null** | **668.4 ns** | **23.56 ns** | **12.32 ns** | **0.0470** |     **-** |     **-** |   **1,880 B** |
| **Construct** |         **Fresh_Object** | **671.0 ns** | **27.24 ns** | **14.25 ns** | **0.0471** |     **-** |     **-** |   **1,880 B** |
| **Construct** |  **RequestOnly_Control** | **255.7 ns** | **16.40 ns** |  **8.58 ns** | **0.0252** |     **-** |     **-** |   **1,024 B** |
| **Construct** |       **Reused_Default** | **268.5 ns** |  **8.03 ns** |  **4.20 ns** | **0.0136** |     **-** |     **-** |     **568 B** |
| **Construct** | **Reuse(...)y1024 [21]** | **252.5 ns** |  **2.50 ns** |  **1.31 ns** | **0.0129** |     **-** |     **-** |     **568 B** |
| **Construct** |  **Reused_Dictionary32** | **253.4 ns** | **16.62 ns** |  **8.69 ns** | **0.0127** |     **-** |     **-** |     **568 B** |
