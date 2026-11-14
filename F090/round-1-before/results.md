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
| **GenerateValidationMessage** | **Clien(...)ustom [24]** |  **88.19 ns** |  **4.517 ns** | **2.362 ns** | **0.0085** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [23]** |  **92.61 ns** | **13.302 ns** | **6.957 ns** | **0.0084** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [22]** |  **89.27 ns** |  **4.505 ns** | **2.356 ns** | **0.0087** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [22]** |  **19.93 ns** |  **0.204 ns** | **0.107 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)Empty [21]** |  **19.71 ns** |  **0.218 ns** | **0.114 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **ClientOff_Valid_Null** |  **19.91 ns** |  **0.753 ns** | **0.394 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)ustom [23]** | **179.77 ns** |  **5.147 ns** | **2.692 ns** | **0.0091** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [22]** | **188.42 ns** |  **4.133 ns** | **2.162 ns** | **0.0096** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [21]** | **183.01 ns** |  **7.301 ns** | **3.819 ns** | **0.0092** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [21]** | **169.28 ns** |  **7.792 ns** | **4.075 ns** | **0.0085** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** | **ClientOn_Valid_Empty** | **146.80 ns** |  **2.837 ns** | **1.484 ns** | **0.0057** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |  **ClientOn_Valid_Null** | **148.37 ns** |  **3.731 ns** | **1.951 ns** | **0.0060** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** | **Overr(...)ustom [23]** | **279.48 ns** |  **7.284 ns** | **3.810 ns** | **0.0114** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** | **Overr(...)_Null [21]** | **284.13 ns** |  **4.492 ns** | **2.350 ns** | **0.0112** |     **-** |     **-** |     **432 B** |
