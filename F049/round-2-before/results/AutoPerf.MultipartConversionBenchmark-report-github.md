``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|  Method |                 Case |        Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |--------------------- |------------:|----------:|----------:|-------:|------:|------:|----------:|
| **Convert** | **Contr(...)erter [21]** |   **301.81 ns** |  **9.019 ns** |  **4.717 ns** | **0.0091** |     **-** |     **-** |     **400 B** |
| **Convert** | **Control_HeaderParser** |   **165.84 ns** |  **3.870 ns** |  **2.024 ns** | **0.0051** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** | **1,462.11 ns** | **26.178 ns** | **13.691 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Convert** | **Conve(...)ename [21]** |   **297.69 ns** | **16.737 ns** |  **8.754 ns** | **0.0089** |     **-** |     **-** |     **352 B** |
| **Convert** |    **Convert_EmptyStar** |   **462.03 ns** | **12.045 ns** |  **6.300 ns** | **0.0135** |     **-** |     **-** |     **664 B** |
| **Convert** | **Conve(...)yStar [21]** | **1,632.37 ns** | **19.563 ns** | **10.232 ns** |      **-** |     **-** |     **-** |     **568 B** |
| **Convert** |    **Convert_FilePlain** | **1,551.26 ns** | **21.458 ns** | **11.223 ns** |      **-** |     **-** |     **-** |     **512 B** |
| **Convert** |     **Convert_FileStar** | **1,958.49 ns** | **52.764 ns** | **27.597 ns** | **0.0194** |     **-** |     **-** |     **880 B** |
| **Convert** | **Conve(...)Empty [21]** |   **560.57 ns** | **21.081 ns** | **11.026 ns** | **0.0168** |     **-** |     **-** |     **720 B** |
| **Convert** | **Conve(...)yName [21]** |   **216.74 ns** | **15.819 ns** |  **8.274 ns** | **0.0065** |     **-** |     **-** |     **256 B** |
| **Convert** |   **Convert_FormNoName** |    **97.08 ns** |  **7.699 ns** |  **4.027 ns** | **0.0020** |     **-** |     **-** |      **80 B** |
| **Convert** |    **Convert_FormPlain** |   **223.39 ns** | **19.661 ns** | **10.283 ns** | **0.0066** |     **-** |     **-** |     **288 B** |
| **Convert** |   **Convert_FormQuoted** |   **276.73 ns** | **20.404 ns** | **10.672 ns** | **0.0079** |     **-** |     **-** |     **296 B** |
| **Convert** |  **Convert_InvalidStar** |   **349.73 ns** |  **9.341 ns** |  **4.885 ns** | **0.0116** |     **-** |     **-** |     **496 B** |
| **Convert** |    **Convert_Malformed** | **1,331.47 ns** | **27.586 ns** | **14.428 ns** |      **-** |     **-** |     **-** |     **240 B** |
| **Convert** |      **Convert_Missing** | **1,287.47 ns** | **16.794 ns** |  **8.783 ns** |      **-** |     **-** |     **-** |     **240 B** |
| **Convert** |    **Convert_Uppercase** | **1,573.71 ns** | **20.114 ns** | **10.520 ns** |      **-** |     **-** |     **-** |     **512 B** |
