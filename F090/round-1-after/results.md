``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                    Method |                 Case |      Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------------------- |--------------------- |----------:|----------:|---------:|-------:|------:|------:|----------:|
| **GenerateValidationMessage** | **Clien(...)ustom [24]** |  **89.45 ns** |  **7.191 ns** | **3.761 ns** | **0.0090** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [23]** |  **90.74 ns** |  **5.133 ns** | **2.685 ns** | **0.0084** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [22]** |  **89.61 ns** |  **7.490 ns** | **3.917 ns** | **0.0084** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [22]** |  **19.82 ns** |  **0.239 ns** | **0.125 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)Empty [21]** |  **19.84 ns** |  **0.337 ns** | **0.176 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **ClientOff_Valid_Null** |  **19.97 ns** |  **0.426 ns** | **0.223 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)ustom [23]** | **170.49 ns** |  **3.912 ns** | **2.046 ns** | **0.0085** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [22]** | **178.08 ns** |  **7.413 ns** | **3.877 ns** | **0.0090** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [21]** | **170.15 ns** |  **7.894 ns** | **4.129 ns** | **0.0088** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [21]** | **158.25 ns** |  **6.415 ns** | **3.355 ns** | **0.0079** |     **-** |     **-** |     **304 B** |
| **GenerateValidationMessage** | **ClientOn_Valid_Empty** | **131.82 ns** |  **3.082 ns** | **1.612 ns** | **0.0040** |     **-** |     **-** |     **192 B** |
| **GenerateValidationMessage** |  **ClientOn_Valid_Null** | **131.02 ns** |  **2.978 ns** | **1.558 ns** | **0.0041** |     **-** |     **-** |     **192 B** |
| **GenerateValidationMessage** | **Overr(...)ustom [23]** | **267.02 ns** | **12.898 ns** | **6.746 ns** | **0.0105** |     **-** |     **-** |     **400 B** |
| **GenerateValidationMessage** | **Overr(...)_Null [21]** | **268.46 ns** |  **6.919 ns** | **3.619 ns** | **0.0081** |     **-** |     **-** |     **400 B** |
