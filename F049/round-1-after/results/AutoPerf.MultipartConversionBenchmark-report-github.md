``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|  Method |                 Case |      Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |--------------------- |----------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **Convert** | **Contr(...)erter [21]** | **585.39 ns** | **477.927 ns** | **249.965 ns** |      **-** |     **-** |     **-** |     **400 B** |
| **Convert** | **Control_HeaderParser** | **163.14 ns** |   **2.075 ns** |   **1.085 ns** | **0.0049** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** | **162.89 ns** |   **2.026 ns** |   **1.060 ns** | **0.0049** |     **-** |     **-** |     **216 B** |
| **Convert** | **Conve(...)ename [21]** | **318.29 ns** |   **3.980 ns** |   **2.081 ns** | **0.0064** |     **-** |     **-** |     **352 B** |
| **Convert** |    **Convert_EmptyStar** | **627.70 ns** |   **7.061 ns** |   **3.693 ns** | **0.0253** |     **-** |     **-** |     **976 B** |
| **Convert** | **Conve(...)yStar [21]** | **302.21 ns** |   **8.678 ns** |   **4.539 ns** | **0.0060** |     **-** |     **-** |     **328 B** |
| **Convert** |    **Convert_FilePlain** | **240.95 ns** |   **7.674 ns** |   **4.013 ns** | **0.0071** |     **-** |     **-** |     **272 B** |
| **Convert** |     **Convert_FileStar** | **508.89 ns** |  **21.383 ns** |  **11.184 ns** | **0.0154** |     **-** |     **-** |     **640 B** |
| **Convert** | **Conve(...)Empty [21]** | **751.18 ns** |  **76.203 ns** |  **39.855 ns** | **0.0219** |     **-** |     **-** |   **1,032 B** |
| **Convert** | **Conve(...)yName [21]** | **234.52 ns** |   **4.536 ns** |   **2.373 ns** | **0.0047** |     **-** |     **-** |     **256 B** |
| **Convert** |   **Convert_FormNoName** |  **99.87 ns** |   **1.918 ns** |   **1.003 ns** | **0.0020** |     **-** |     **-** |      **80 B** |
| **Convert** |    **Convert_FormPlain** | **232.04 ns** |   **2.725 ns** |   **1.425 ns** | **0.0070** |     **-** |     **-** |     **288 B** |
| **Convert** |   **Convert_FormQuoted** | **276.93 ns** |   **3.308 ns** |   **1.730 ns** | **0.0056** |     **-** |     **-** |     **296 B** |
| **Convert** |  **Convert_InvalidStar** | **459.48 ns** |   **9.848 ns** |   **5.151 ns** | **0.0139** |     **-** |     **-** |     **640 B** |
| **Convert** |    **Convert_Malformed** |  **43.71 ns** |   **0.454 ns** |   **0.238 ns** |      **-** |     **-** |     **-** |         **-** |
| **Convert** |      **Convert_Missing** |  **14.56 ns** |   **0.191 ns** |   **0.100 ns** |      **-** |     **-** |     **-** |         **-** |
| **Convert** |    **Convert_Uppercase** | **218.26 ns** |   **4.187 ns** |   **2.190 ns** | **0.0066** |     **-** |     **-** |     **272 B** |
