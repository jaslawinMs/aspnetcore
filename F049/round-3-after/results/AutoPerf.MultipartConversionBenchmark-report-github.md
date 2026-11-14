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
| **Convert** | **Contr(...)erter [21]** |   **322.78 ns** |  **40.544 ns** | **21.205 ns** | **0.0104** |     **-** |     **-** |     **400 B** |
| **Convert** | **Control_HeaderParser** |   **177.64 ns** |  **19.458 ns** | **10.177 ns** | **0.0049** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** |   **179.73 ns** |  **23.340 ns** | **12.207 ns** | **0.0056** |     **-** |     **-** |     **216 B** |
| **Convert** | **Conve(...)ename [21]** |   **321.47 ns** |  **28.862 ns** | **15.096 ns** | **0.0091** |     **-** |     **-** |     **352 B** |
| **Convert** |    **Convert_EmptyStar** |   **512.88 ns** |  **55.997 ns** | **29.288 ns** | **0.0140** |     **-** |     **-** |     **664 B** |
| **Convert** | **Conve(...)yStar [21]** |   **321.47 ns** |  **19.854 ns** | **10.384 ns** | **0.0065** |     **-** |     **-** |     **328 B** |
| **Convert** |    **Convert_FilePlain** |   **241.82 ns** |  **21.286 ns** | **11.133 ns** | **0.0070** |     **-** |     **-** |     **272 B** |
| **Convert** |     **Convert_FileStar** | **2,503.29 ns** | **105.840 ns** | **55.357 ns** | **0.0244** |     **-** |     **-** |     **984 B** |
| **Convert** | **Conve(...)Empty [21]** |   **622.88 ns** |  **72.405 ns** | **37.869 ns** | **0.0174** |     **-** |     **-** |     **720 B** |
| **Convert** | **Conve(...)yName [21]** |   **230.83 ns** |  **16.458 ns** |  **8.608 ns** | **0.0066** |     **-** |     **-** |     **256 B** |
| **Convert** |   **Convert_FormNoName** |    **89.18 ns** |   **1.320 ns** |  **0.690 ns** | **0.0019** |     **-** |     **-** |      **80 B** |
| **Convert** |    **Convert_FormPlain** |   **234.68 ns** |  **20.649 ns** | **10.800 ns** | **0.0066** |     **-** |     **-** |     **288 B** |
| **Convert** |   **Convert_FormQuoted** |   **281.67 ns** |  **17.189 ns** |  **8.990 ns** | **0.0057** |     **-** |     **-** |     **296 B** |
| **Convert** |  **Convert_InvalidStar** |   **398.60 ns** |  **24.401 ns** | **12.762 ns** | **0.0106** |     **-** |     **-** |     **496 B** |
| **Convert** |    **Convert_Malformed** |    **42.94 ns** |   **0.433 ns** |  **0.226 ns** |      **-** |     **-** |     **-** |         **-** |
| **Convert** |      **Convert_Missing** |    **15.10 ns** |   **0.164 ns** |  **0.086 ns** |      **-** |     **-** |     **-** |         **-** |
| **Convert** |    **Convert_Uppercase** |   **234.58 ns** |  **24.686 ns** | **12.911 ns** | **0.0065** |     **-** |     **-** |     **272 B** |
