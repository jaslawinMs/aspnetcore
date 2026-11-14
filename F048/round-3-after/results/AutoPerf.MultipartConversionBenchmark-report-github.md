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
| **Convert** | **Contr(...)erter [21]** |   **202.60 ns** |  **6.462 ns** |  **3.380 ns** | **0.0061** |     **-** |     **-** |     **288 B** |
| **Convert** | **Control_HeaderParser** |   **159.89 ns** |  **2.452 ns** |  **1.283 ns** | **0.0050** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** |   **165.80 ns** |  **2.933 ns** |  **1.534 ns** | **0.0050** |     **-** |     **-** |     **216 B** |
| **Convert** | **Conve(...)ename [21]** | **2,081.53 ns** | **28.262 ns** | **14.781 ns** |      **-** |     **-** |     **-** |     **624 B** |
| **Convert** |    **Convert_EmptyStar** | **2,324.48 ns** | **34.898 ns** | **18.252 ns** | **0.0230** |     **-** |     **-** |     **936 B** |
| **Convert** | **Conve(...)yStar [21]** |   **690.83 ns** | **56.589 ns** | **29.597 ns** | **0.0272** |     **-** |     **-** |   **1,040 B** |
| **Convert** |   **Convert_FileNoName** |   **238.42 ns** |  **4.480 ns** |  **2.343 ns** | **0.0071** |     **-** |     **-** |     **304 B** |
| **Convert** |    **Convert_FilePlain** |   **308.80 ns** |  **9.488 ns** |  **4.963 ns** | **0.0092** |     **-** |     **-** |     **400 B** |
| **Convert** |   **Convert_FileQuoted** |   **425.59 ns** | **30.566 ns** | **15.987 ns** | **0.0086** |     **-** |     **-** |     **408 B** |
| **Convert** |     **Convert_FileStar** | **1,125.00 ns** | **18.206 ns** |  **9.522 ns** | **0.0336** |     **-** |     **-** |   **1,464 B** |
| **Convert** | **Conve(...)erred [25]** |   **878.13 ns** | **15.066 ns** |  **7.880 ns** | **0.0262** |     **-** |     **-** |   **1,136 B** |
| **Convert** |         **Convert_Form** |   **184.11 ns** | **16.336 ns** |  **8.544 ns** | **0.0055** |     **-** |     **-** |     **216 B** |
| **Convert** |       **Convert_Inline** |   **165.10 ns** |  **1.524 ns** |  **0.797 ns** | **0.0050** |     **-** |     **-** |     **216 B** |
| **Convert** |    **Convert_Malformed** |    **42.49 ns** |  **0.496 ns** |  **0.260 ns** |      **-** |     **-** |     **-** |         **-** |
| **Convert** |      **Convert_Missing** |    **16.14 ns** |  **0.503 ns** |  **0.263 ns** |      **-** |     **-** |     **-** |         **-** |
| **Convert** | **Conve(...)meter [22]** |   **229.11 ns** | **16.414 ns** |  **8.585 ns** | **0.0068** |     **-** |     **-** |     **272 B** |
| **Convert** |    **Convert_Uppercase** |   **204.41 ns** |  **3.081 ns** |  **1.611 ns** | **0.0061** |     **-** |     **-** |     **272 B** |
