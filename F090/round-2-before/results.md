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
| **GenerateValidationMessage** | **Clien(...)ustom [24]** |  **86.88 ns** |  **6.669 ns** | **3.488 ns** | **0.0087** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [23]** |  **94.39 ns** | **10.643 ns** | **5.566 ns** | **0.0092** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [22]** |  **88.26 ns** |  **3.705 ns** | **1.938 ns** | **0.0091** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [22]** |  **18.08 ns** |  **0.374 ns** | **0.195 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)Empty [21]** |  **17.94 ns** |  **0.114 ns** | **0.059 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **ClientOff_Valid_Null** |  **18.00 ns** |  **0.131 ns** | **0.069 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)ustom [23]** | **179.96 ns** | **11.011 ns** | **5.759 ns** | **0.0092** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [22]** | **188.31 ns** |  **5.073 ns** | **2.653 ns** | **0.0095** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [21]** | **185.36 ns** |  **5.368 ns** | **2.807 ns** | **0.0094** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [21]** | **168.46 ns** |  **5.140 ns** | **2.688 ns** | **0.0087** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** | **ClientOn_Valid_Empty** | **149.44 ns** | **17.523 ns** | **9.165 ns** | **0.0045** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |  **ClientOn_Valid_Null** | **144.71 ns** |  **4.503 ns** | **2.355 ns** | **0.0046** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** | **Overr(...)ustom [23]** | **288.64 ns** | **10.192 ns** | **5.330 ns** | **0.0113** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** | **Overr(...)_Null [21]** | **293.23 ns** |  **9.679 ns** | **5.062 ns** | **0.0114** |     **-** |     **-** |     **432 B** |
