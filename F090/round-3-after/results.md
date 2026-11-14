``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                    Method |                 Case |      Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------------------- |--------------------- |----------:|----------:|----------:|-------:|------:|------:|----------:|
| **GenerateValidationMessage** | **Clien(...)ustom [24]** |  **86.67 ns** | **12.564 ns** |  **6.571 ns** | **0.0088** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [23]** |  **90.77 ns** |  **4.679 ns** |  **2.447 ns** | **0.0083** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [22]** |  **88.46 ns** |  **2.594 ns** |  **1.357 ns** | **0.0090** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [22]** |  **20.22 ns** |  **3.924 ns** |  **2.052 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)Empty [21]** |  **19.30 ns** |  **0.745 ns** |  **0.390 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **ClientOff_Valid_Null** |  **19.12 ns** |  **0.135 ns** |  **0.070 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)ustom [23]** | **169.24 ns** | **22.343 ns** | **11.686 ns** | **0.0084** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [22]** | **170.58 ns** |  **4.509 ns** |  **2.358 ns** | **0.0086** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [21]** | **168.02 ns** |  **3.350 ns** |  **1.752 ns** | **0.0087** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [21]** | **154.07 ns** |  **9.490 ns** |  **4.964 ns** | **0.0078** |     **-** |     **-** |     **304 B** |
| **GenerateValidationMessage** | **ClientOn_Valid_Empty** | **130.49 ns** |  **4.835 ns** |  **2.529 ns** | **0.0040** |     **-** |     **-** |     **192 B** |
| **GenerateValidationMessage** |  **ClientOn_Valid_Null** | **128.40 ns** |  **4.890 ns** |  **2.557 ns** | **0.0066** |     **-** |     **-** |     **192 B** |
| **GenerateValidationMessage** | **Overr(...)ustom [23]** | **268.11 ns** | **33.232 ns** | **17.381 ns** | **0.0106** |     **-** |     **-** |     **400 B** |
| **GenerateValidationMessage** | **Overr(...)_Null [21]** | **269.54 ns** |  **5.286 ns** |  **2.765 ns** | **0.0107** |     **-** |     **-** |     **400 B** |
