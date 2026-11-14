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
| **Convert** | **Contr(...)erter [21]** |   **302.07 ns** |  **8.470 ns** |  **4.430 ns** | **0.0091** |     **-** |     **-** |     **400 B** |
| **Convert** | **Control_HeaderParser** |   **165.78 ns** |  **8.711 ns** |  **4.556 ns** | **0.0050** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** | **1,551.09 ns** | **21.175 ns** | **11.075 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Convert** | **Conve(...)ename [21]** |   **289.91 ns** |  **6.606 ns** |  **3.455 ns** | **0.0087** |     **-** |     **-** |     **352 B** |
| **Convert** |    **Convert_EmptyStar** |   **505.24 ns** | **67.101 ns** | **35.095 ns** | **0.0141** |     **-** |     **-** |     **664 B** |
| **Convert** | **Conve(...)yStar [21]** | **1,779.06 ns** | **58.896 ns** | **30.804 ns** |      **-** |     **-** |     **-** |     **568 B** |
| **Convert** |    **Convert_FilePlain** | **1,660.75 ns** | **25.322 ns** | **13.244 ns** |      **-** |     **-** |     **-** |     **512 B** |
| **Convert** |     **Convert_FileStar** | **1,998.82 ns** | **34.572 ns** | **18.082 ns** | **0.0198** |     **-** |     **-** |     **880 B** |
| **Convert** | **Conve(...)Empty [21]** |   **580.25 ns** | **20.432 ns** | **10.686 ns** | **0.0173** |     **-** |     **-** |     **720 B** |
| **Convert** | **Conve(...)yName [21]** |   **229.36 ns** |  **9.930 ns** |  **5.194 ns** | **0.0067** |     **-** |     **-** |     **256 B** |
| **Convert** |   **Convert_FormNoName** |    **95.24 ns** |  **6.668 ns** |  **3.487 ns** | **0.0020** |     **-** |     **-** |      **80 B** |
| **Convert** |    **Convert_FormPlain** |   **216.45 ns** |  **6.643 ns** |  **3.474 ns** | **0.0074** |     **-** |     **-** |     **288 B** |
| **Convert** |   **Convert_FormQuoted** |   **266.91 ns** |  **6.430 ns** |  **3.363 ns** | **0.0079** |     **-** |     **-** |     **296 B** |
| **Convert** |  **Convert_InvalidStar** |   **359.06 ns** | **13.513 ns** |  **7.067 ns** | **0.0106** |     **-** |     **-** |     **496 B** |
| **Convert** |    **Convert_Malformed** | **1,418.35 ns** | **20.416 ns** | **10.678 ns** |      **-** |     **-** |     **-** |     **240 B** |
| **Convert** |      **Convert_Missing** | **1,396.60 ns** | **31.344 ns** | **16.394 ns** |      **-** |     **-** |     **-** |     **240 B** |
| **Convert** |    **Convert_Uppercase** | **1,663.53 ns** | **64.167 ns** | **33.561 ns** |      **-** |     **-** |     **-** |     **512 B** |
