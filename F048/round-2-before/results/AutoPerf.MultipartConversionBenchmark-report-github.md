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
| **Convert** | **Contr(...)erter [21]** |   **515.3 ns** | **378.63 ns** | **198.03 ns** |      **-** |     **-** |     **-** |     **288 B** |
| **Convert** | **Control_HeaderParser** |   **162.6 ns** |   **1.18 ns** |   **0.62 ns** | **0.0050** |     **-** |     **-** |     **216 B** |
| **Convert** |   **Convert_Attachment** | **1,484.3 ns** |  **21.16 ns** |  **11.07 ns** |      **-** |     **-** |     **-** |     **464 B** |
| **Convert** | **Conve(...)ename [21]** | **1,589.2 ns** |  **12.00 ns** |   **6.27 ns** |      **-** |     **-** |     **-** |     **520 B** |
| **Convert** |    **Convert_EmptyStar** | **1,783.5 ns** |  **20.47 ns** |  **10.71 ns** | **0.0178** |     **-** |     **-** |     **832 B** |
| **Convert** | **Conve(...)yStar [21]** |   **672.4 ns** |  **24.18 ns** |  **12.65 ns** | **0.0267** |     **-** |     **-** |   **1,040 B** |
| **Convert** |   **Convert_FileNoName** |   **234.4 ns** |   **6.23 ns** |   **3.26 ns** | **0.0070** |     **-** |     **-** |     **304 B** |
| **Convert** |    **Convert_FilePlain** |   **303.8 ns** |  **22.77 ns** |  **11.91 ns** | **0.0097** |     **-** |     **-** |     **400 B** |
| **Convert** |   **Convert_FileQuoted** |   **402.8 ns** |   **8.25 ns** |   **4.32 ns** | **0.0080** |     **-** |     **-** |     **408 B** |
| **Convert** |     **Convert_FileStar** | **1,119.6 ns** |  **24.09 ns** |  **12.60 ns** | **0.0339** |     **-** |     **-** |   **1,464 B** |
| **Convert** | **Conve(...)erred [25]** |   **873.9 ns** |  **11.01 ns** |   **5.76 ns** | **0.0261** |     **-** |     **-** |   **1,136 B** |
| **Convert** |         **Convert_Form** | **1,504.1 ns** |  **24.64 ns** |  **12.89 ns** |      **-** |     **-** |     **-** |     **464 B** |
| **Convert** |       **Convert_Inline** | **1,488.7 ns** |  **37.96 ns** |  **19.85 ns** |      **-** |     **-** |     **-** |     **464 B** |
| **Convert** |    **Convert_Malformed** | **1,339.0 ns** |  **32.98 ns** |  **17.25 ns** |      **-** |     **-** |     **-** |     **248 B** |
| **Convert** |      **Convert_Missing** | **1,287.8 ns** |  **18.51 ns** |   **9.68 ns** |      **-** |     **-** |     **-** |     **248 B** |
| **Convert** | **Conve(...)meter [22]** | **1,565.1 ns** |  **32.86 ns** |  **17.19 ns** |      **-** |     **-** |     **-** |     **520 B** |
| **Convert** |    **Convert_Uppercase** | **1,548.4 ns** |  **21.99 ns** |  **11.50 ns** |      **-** |     **-** |     **-** |     **520 B** |
