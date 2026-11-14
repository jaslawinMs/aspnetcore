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
| **Construct** |    **Dictionary_Absent** | **630.7 ns** |  **16.21 ns** |  **8.48 ns** | **0.0452** |     **-** |     **-** |   **1,880 B** |
| **Construct** |    **Dictionary_Custom** | **650.9 ns** |  **14.11 ns** |  **7.38 ns** | **0.0456** |     **-** |     **-** |   **1,880 B** |
| **Construct** |         **Fresh_Absent** | **770.1 ns** | **176.35 ns** | **92.23 ns** | **0.0447** |     **-** |     **-** |   **1,880 B** |
| **Construct** |         **Fresh_Custom** | **660.4 ns** |  **13.17 ns** |  **6.89 ns** | **0.0466** |     **-** |     **-** |   **1,880 B** |
| **Construct** |        **Fresh_Default** | **688.4 ns** |  **71.82 ns** | **37.56 ns** | **0.0464** |     **-** |     **-** |   **1,880 B** |
| **Construct** |          **Fresh_Empty** | **681.9 ns** |  **23.97 ns** | **12.54 ns** | **0.0482** |     **-** |     **-** |   **1,880 B** |
| **Construct** |           **Fresh_Null** | **671.6 ns** |  **57.79 ns** | **30.23 ns** | **0.0461** |     **-** |     **-** |   **1,880 B** |
| **Construct** |         **Fresh_Object** | **661.6 ns** |  **11.40 ns** |  **5.96 ns** | **0.0463** |     **-** |     **-** |   **1,880 B** |
| **Construct** |  **RequestOnly_Control** | **269.0 ns** |  **27.51 ns** | **14.39 ns** | **0.0261** |     **-** |     **-** |   **1,024 B** |
| **Construct** |       **Reused_Default** | **257.3 ns** |   **6.75 ns** |  **3.53 ns** | **0.0130** |     **-** |     **-** |     **568 B** |
| **Construct** | **Reuse(...)y1024 [21]** | **257.5 ns** |  **25.65 ns** | **13.41 ns** | **0.0152** |     **-** |     **-** |     **568 B** |
| **Construct** |  **Reused_Dictionary32** | **248.5 ns** |   **4.31 ns** |  **2.26 ns** | **0.0129** |     **-** |     **-** |     **568 B** |
