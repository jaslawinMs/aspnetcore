``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|  Method |                 Case |       Mean |    Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |--------------------- |-----------:|---------:|---------:|-------:|------:|------:|----------:|
| **Convert** | **Contr(...)erter [21]** |   **203.1 ns** |  **2.93 ns** |  **1.53 ns** | **0.0061** |     **-** |     **-** |     **288 B** |
| **Convert** | **Control_HeaderParser** |   **164.3 ns** | **14.30 ns** |  **7.48 ns** | **0.0049** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** | **1,477.2 ns** | **27.04 ns** | **14.14 ns** |      **-** |     **-** |     **-** |     **464 B** |
| **Convert** | **Conve(...)ename [21]** | **1,593.9 ns** | **24.46 ns** | **12.79 ns** |      **-** |     **-** |     **-** |     **520 B** |
| **Convert** |    **Convert_EmptyStar** | **1,853.9 ns** | **84.82 ns** | **44.36 ns** | **0.0179** |     **-** |     **-** |     **832 B** |
| **Convert** | **Conve(...)yStar [21]** |   **672.2 ns** | **16.10 ns** |  **8.42 ns** | **0.0265** |     **-** |     **-** |   **1,040 B** |
| **Convert** |   **Convert_FileNoName** |   **230.6 ns** |  **2.37 ns** |  **1.24 ns** | **0.0071** |     **-** |     **-** |     **304 B** |
| **Convert** |    **Convert_FilePlain** |   **291.5 ns** |  **4.37 ns** |  **2.28 ns** | **0.0087** |     **-** |     **-** |     **400 B** |
| **Convert** |   **Convert_FileQuoted** |   **399.2 ns** |  **3.39 ns** |  **1.77 ns** | **0.0080** |     **-** |     **-** |     **408 B** |
| **Convert** |     **Convert_FileStar** | **1,124.4 ns** | **23.70 ns** | **12.40 ns** | **0.0335** |     **-** |     **-** |   **1,464 B** |
| **Convert** | **Conve(...)erred [25]** |   **889.3 ns** | **15.31 ns** |  **8.01 ns** | **0.0262** |     **-** |     **-** |   **1,136 B** |
| **Convert** |         **Convert_Form** | **1,498.2 ns** | **24.71 ns** | **12.92 ns** |      **-** |     **-** |     **-** |     **464 B** |
| **Convert** |       **Convert_Inline** | **1,487.4 ns** | **22.70 ns** | **11.87 ns** |      **-** |     **-** |     **-** |     **464 B** |
| **Convert** |    **Convert_Malformed** | **1,329.2 ns** | **18.56 ns** |  **9.71 ns** |      **-** |     **-** |     **-** |     **248 B** |
| **Convert** |      **Convert_Missing** | **1,289.6 ns** | **14.84 ns** |  **7.76 ns** |      **-** |     **-** |     **-** |     **248 B** |
| **Convert** | **Conve(...)meter [22]** | **1,566.8 ns** | **16.59 ns** |  **8.67 ns** |      **-** |     **-** |     **-** |     **520 B** |
| **Convert** |    **Convert_Uppercase** | **1,533.2 ns** | **33.79 ns** | **17.67 ns** |      **-** |     **-** |     **-** |     **520 B** |
