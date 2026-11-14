``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|  Method |                 Case |       Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |--------------------- |-----------:|----------:|----------:|-------:|------:|------:|----------:|
| **Convert** | **Contr(...)erter [21]** |   **498.7 ns** | **340.19 ns** | **177.92 ns** |      **-** |     **-** |     **-** |     **288 B** |
| **Convert** | **Control_HeaderParser** |   **164.0 ns** |   **2.45 ns** |   **1.28 ns** | **0.0057** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** | **1,529.3 ns** |  **27.62 ns** |  **14.44 ns** |      **-** |     **-** |     **-** |     **464 B** |
| **Convert** | **Conve(...)ename [21]** | **1,620.8 ns** |  **20.64 ns** |  **10.79 ns** |      **-** |     **-** |     **-** |     **520 B** |
| **Convert** |    **Convert_EmptyStar** | **1,806.5 ns** |  **19.38 ns** |  **10.14 ns** | **0.0181** |     **-** |     **-** |     **832 B** |
| **Convert** | **Conve(...)yStar [21]** |   **667.4 ns** |  **42.20 ns** |  **22.07 ns** | **0.0262** |     **-** |     **-** |   **1,040 B** |
| **Convert** |   **Convert_FileNoName** |   **231.0 ns** |   **4.58 ns** |   **2.40 ns** | **0.0070** |     **-** |     **-** |     **304 B** |
| **Convert** |    **Convert_FilePlain** |   **293.4 ns** |   **3.46 ns** |   **1.81 ns** | **0.0089** |     **-** |     **-** |     **400 B** |
| **Convert** |   **Convert_FileQuoted** |   **406.8 ns** |   **8.33 ns** |   **4.36 ns** | **0.0081** |     **-** |     **-** |     **408 B** |
| **Convert** |     **Convert_FileStar** | **1,096.5 ns** |  **12.59 ns** |   **6.59 ns** | **0.0331** |     **-** |     **-** |   **1,464 B** |
| **Convert** | **Conve(...)erred [25]** |   **870.3 ns** |  **16.49 ns** |   **8.63 ns** | **0.0260** |     **-** |     **-** |   **1,136 B** |
| **Convert** |         **Convert_Form** | **1,523.0 ns** |  **20.17 ns** |  **10.55 ns** |      **-** |     **-** |     **-** |     **464 B** |
| **Convert** |       **Convert_Inline** | **1,536.4 ns** |  **16.33 ns** |   **8.54 ns** |      **-** |     **-** |     **-** |     **464 B** |
| **Convert** |    **Convert_Malformed** | **1,373.6 ns** |  **13.57 ns** |   **7.10 ns** |      **-** |     **-** |     **-** |     **248 B** |
| **Convert** |      **Convert_Missing** | **1,367.0 ns** |  **57.20 ns** |  **29.91 ns** |      **-** |     **-** |     **-** |     **248 B** |
| **Convert** | **Conve(...)meter [22]** | **1,609.5 ns** |  **47.53 ns** |  **24.86 ns** |      **-** |     **-** |     **-** |     **520 B** |
| **Convert** |    **Convert_Uppercase** | **1,574.8 ns** |  **30.80 ns** |  **16.11 ns** |      **-** |     **-** |     **-** |     **520 B** |
