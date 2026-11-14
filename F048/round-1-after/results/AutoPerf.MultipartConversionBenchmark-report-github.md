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
| **Convert** | **Contr(...)erter [21]** |   **219.24 ns** | **55.634 ns** | **29.098 ns** | **0.0054** |     **-** |     **-** |     **288 B** |
| **Convert** | **Control_HeaderParser** |   **164.56 ns** |  **8.856 ns** |  **4.632 ns** | **0.0049** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** |   **166.25 ns** |  **5.930 ns** |  **3.102 ns** | **0.0050** |     **-** |     **-** |     **216 B** |
| **Convert** | **Conve(...)ename [21]** |   **245.08 ns** |  **4.026 ns** |  **2.106 ns** | **0.0049** |     **-** |     **-** |     **272 B** |
| **Convert** |    **Convert_EmptyStar** |   **397.77 ns** |  **8.277 ns** |  **4.329 ns** | **0.0119** |     **-** |     **-** |     **584 B** |
| **Convert** | **Conve(...)yStar [21]** |   **689.25 ns** |  **9.563 ns** |  **5.001 ns** | **0.0277** |     **-** |     **-** |   **1,040 B** |
| **Convert** |   **Convert_FileNoName** |   **245.62 ns** |  **1.953 ns** |  **1.021 ns** | **0.0075** |     **-** |     **-** |     **304 B** |
| **Convert** |    **Convert_FilePlain** |   **320.39 ns** |  **7.746 ns** |  **4.052 ns** | **0.0096** |     **-** |     **-** |     **400 B** |
| **Convert** |   **Convert_FileQuoted** |   **440.78 ns** | **10.983 ns** |  **5.744 ns** | **0.0088** |     **-** |     **-** |     **408 B** |
| **Convert** |     **Convert_FileStar** | **1,397.62 ns** | **30.527 ns** | **15.966 ns** | **0.0419** |     **-** |     **-** |   **1,832 B** |
| **Convert** | **Conve(...)erred [25]** |   **907.93 ns** | **34.922 ns** | **18.265 ns** | **0.0271** |     **-** |     **-** |   **1,136 B** |
| **Convert** |         **Convert_Form** |   **181.56 ns** |  **4.654 ns** |  **2.434 ns** | **0.0058** |     **-** |     **-** |     **216 B** |
| **Convert** |       **Convert_Inline** |   **161.14 ns** |  **2.542 ns** |  **1.329 ns** | **0.0049** |     **-** |     **-** |     **216 B** |
| **Convert** |    **Convert_Malformed** |    **42.13 ns** |  **0.647 ns** |  **0.339 ns** |      **-** |     **-** |     **-** |         **-** |
| **Convert** |      **Convert_Missing** |    **14.67 ns** |  **0.244 ns** |  **0.128 ns** |      **-** |     **-** |     **-** |         **-** |
| **Convert** | **Conve(...)meter [22]** |   **227.19 ns** | **11.770 ns** |  **6.156 ns** | **0.0068** |     **-** |     **-** |     **272 B** |
| **Convert** |    **Convert_Uppercase** |   **208.41 ns** |  **4.303 ns** |  **2.251 ns** | **0.0062** |     **-** |     **-** |     **272 B** |
