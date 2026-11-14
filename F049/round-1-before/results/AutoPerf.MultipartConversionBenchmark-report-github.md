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
| **Convert** | **Contr(...)erter [21]** |   **294.70 ns** | **23.560 ns** | **12.322 ns** | **0.0088** |     **-** |     **-** |     **400 B** |
| **Convert** | **Control_HeaderParser** |   **158.35 ns** |  **3.207 ns** |  **1.678 ns** | **0.0048** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** | **1,499.70 ns** | **41.615 ns** | **21.765 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Convert** | **Conve(...)ename [21]** |   **304.80 ns** | **21.798 ns** | **11.401 ns** | **0.0088** |     **-** |     **-** |     **352 B** |
| **Convert** |    **Convert_EmptyStar** |   **434.63 ns** | **10.119 ns** |  **5.292 ns** | **0.0136** |     **-** |     **-** |     **664 B** |
| **Convert** | **Conve(...)yStar [21]** | **1,721.85 ns** | **96.488 ns** | **50.465 ns** |      **-** |     **-** |     **-** |     **568 B** |
| **Convert** |    **Convert_FilePlain** | **1,571.94 ns** | **13.047 ns** |  **6.824 ns** |      **-** |     **-** |     **-** |     **512 B** |
| **Convert** |     **Convert_FileStar** | **1,978.02 ns** | **48.759 ns** | **25.502 ns** | **0.0214** |     **-** |     **-** |     **880 B** |
| **Convert** | **Conve(...)Empty [21]** |   **544.40 ns** | **35.191 ns** | **18.405 ns** | **0.0163** |     **-** |     **-** |     **720 B** |
| **Convert** | **Conve(...)yName [21]** |   **213.61 ns** |  **6.883 ns** |  **3.600 ns** | **0.0064** |     **-** |     **-** |     **256 B** |
| **Convert** |   **Convert_FormNoName** |    **93.93 ns** |  **1.474 ns** |  **0.771 ns** | **0.0019** |     **-** |     **-** |      **80 B** |
| **Convert** |    **Convert_FormPlain** |   **206.01 ns** |  **7.861 ns** |  **4.111 ns** | **0.0063** |     **-** |     **-** |     **288 B** |
| **Convert** |   **Convert_FormQuoted** |   **255.52 ns** |  **6.986 ns** |  **3.654 ns** | **0.0076** |     **-** |     **-** |     **296 B** |
| **Convert** |  **Convert_InvalidStar** |   **334.59 ns** |  **9.547 ns** |  **4.993 ns** | **0.0130** |     **-** |     **-** |     **496 B** |
| **Convert** |    **Convert_Malformed** | **1,349.05 ns** | **39.879 ns** | **20.857 ns** |      **-** |     **-** |     **-** |     **240 B** |
| **Convert** |      **Convert_Missing** | **1,316.95 ns** | **43.295 ns** | **22.644 ns** |      **-** |     **-** |     **-** |     **240 B** |
| **Convert** |    **Convert_Uppercase** | **1,569.66 ns** | **41.419 ns** | **21.663 ns** |      **-** |     **-** |     **-** |     **512 B** |
