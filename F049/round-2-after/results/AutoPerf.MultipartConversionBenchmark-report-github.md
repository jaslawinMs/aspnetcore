``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|  Method |                 Case |        Mean |      Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |--------------------- |------------:|-----------:|----------:|-------:|------:|------:|----------:|
| **Convert** | **Contr(...)erter [21]** |   **301.44 ns** |   **7.394 ns** |  **3.867 ns** | **0.0092** |     **-** |     **-** |     **400 B** |
| **Convert** | **Control_HeaderParser** |   **166.10 ns** |   **3.945 ns** |  **2.063 ns** | **0.0053** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** |   **166.55 ns** |   **6.579 ns** |  **3.441 ns** | **0.0049** |     **-** |     **-** |     **216 B** |
| **Convert** | **Conve(...)ename [21]** |   **316.16 ns** |  **39.420 ns** | **20.617 ns** | **0.0091** |     **-** |     **-** |     **352 B** |
| **Convert** |    **Convert_EmptyStar** |   **492.35 ns** |  **52.225 ns** | **27.315 ns** | **0.0138** |     **-** |     **-** |     **664 B** |
| **Convert** | **Conve(...)yStar [21]** |   **307.45 ns** |  **25.097 ns** | **13.126 ns** | **0.0061** |     **-** |     **-** |     **328 B** |
| **Convert** |    **Convert_FilePlain** |   **233.22 ns** |   **8.816 ns** |  **4.611 ns** | **0.0069** |     **-** |     **-** |     **272 B** |
| **Convert** |     **Convert_FileStar** | **2,472.91 ns** | **131.340 ns** | **68.693 ns** | **0.0243** |     **-** |     **-** |     **984 B** |
| **Convert** | **Conve(...)Empty [21]** |   **578.91 ns** |  **16.725 ns** |  **8.747 ns** | **0.0171** |     **-** |     **-** |     **720 B** |
| **Convert** | **Conve(...)yName [21]** |   **230.67 ns** |  **21.580 ns** | **11.287 ns** | **0.0065** |     **-** |     **-** |     **256 B** |
| **Convert** |   **Convert_FormNoName** |    **85.10 ns** |   **2.349 ns** |  **1.229 ns** | **0.0018** |     **-** |     **-** |      **80 B** |
| **Convert** |    **Convert_FormPlain** |   **216.67 ns** |   **3.040 ns** |  **1.590 ns** | **0.0066** |     **-** |     **-** |     **288 B** |
| **Convert** |   **Convert_FormQuoted** |   **261.16 ns** |   **4.668 ns** |  **2.442 ns** | **0.0053** |     **-** |     **-** |     **296 B** |
| **Convert** |  **Convert_InvalidStar** |   **361.44 ns** |  **24.373 ns** | **12.748 ns** | **0.0105** |     **-** |     **-** |     **496 B** |
| **Convert** |    **Convert_Malformed** |    **43.50 ns** |   **0.778 ns** |  **0.407 ns** |      **-** |     **-** |     **-** |         **-** |
| **Convert** |      **Convert_Missing** |    **15.17 ns** |   **0.419 ns** |  **0.219 ns** |      **-** |     **-** |     **-** |         **-** |
| **Convert** |    **Convert_Uppercase** |   **216.16 ns** |   **4.197 ns** |  **2.195 ns** | **0.0067** |     **-** |     **-** |     **272 B** |
