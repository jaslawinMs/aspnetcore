``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|    Method | ItemCount | Nested |          Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------- |---------- |------- |--------------:|-------------:|-------------:|-------:|------:|------:|----------:|
| **Enumerate** |         **1** |  **False** |      **29.65 ns** |     **3.036 ns** |     **1.588 ns** | **0.0022** |     **-** |     **-** |      **88 B** |
| **Enumerate** |         **1** |   **True** |      **56.92 ns** |     **5.415 ns** |     **2.832 ns** | **0.0023** |     **-** |     **-** |      **88 B** |
| **Enumerate** |        **10** |  **False** |      **63.24 ns** |     **9.923 ns** |     **5.190 ns** | **0.0019** |     **-** |     **-** |      **88 B** |
| **Enumerate** |        **10** |   **True** |     **291.58 ns** |    **29.704 ns** |    **15.536 ns** | **0.0085** |     **-** |     **-** |     **328 B** |
| **Enumerate** |       **100** |  **False** |     **444.12 ns** |    **38.529 ns** |    **20.151 ns** |      **-** |     **-** |     **-** |      **88 B** |
| **Enumerate** |       **100** |   **True** |   **2,966.37 ns** |   **415.485 ns** |   **217.307 ns** | **0.0576** |     **-** |     **-** |   **2,192 B** |
| **Enumerate** |      **1000** |  **False** |   **4,291.76 ns** |   **521.373 ns** |   **272.688 ns** |      **-** |     **-** |     **-** |      **88 B** |
| **Enumerate** |      **1000** |   **True** | **111,350.03 ns** | **3,720.191 ns** | **1,945.732 ns** |      **-** |     **-** |     **-** |  **16,605 B** |
