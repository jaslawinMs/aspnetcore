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
| **GenerateValidationMessage** | **Clien(...)ustom [24]** |  **85.98 ns** | **12.805 ns** |  **6.697 ns** | **0.0087** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [23]** |  **95.67 ns** | **17.461 ns** |  **9.133 ns** | **0.0083** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [22]** |  **88.11 ns** |  **4.690 ns** |  **2.453 ns** | **0.0085** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [22]** |  **18.02 ns** |  **0.246 ns** |  **0.129 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)Empty [21]** |  **18.03 ns** |  **0.218 ns** |  **0.114 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **ClientOff_Valid_Null** |  **18.47 ns** |  **1.219 ns** |  **0.637 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)ustom [23]** | **181.44 ns** | **21.647 ns** | **11.322 ns** | **0.0092** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [22]** | **183.16 ns** |  **4.701 ns** |  **2.459 ns** | **0.0093** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [21]** | **178.68 ns** |  **5.428 ns** |  **2.839 ns** | **0.0090** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [21]** | **164.74 ns** |  **4.535 ns** |  **2.372 ns** | **0.0083** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** | **ClientOn_Valid_Empty** | **144.42 ns** |  **5.147 ns** |  **2.692 ns** | **0.0058** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |  **ClientOn_Valid_Null** | **141.96 ns** |  **4.089 ns** |  **2.138 ns** | **0.0047** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** | **Overr(...)ustom [23]** | **280.79 ns** |  **4.936 ns** |  **2.582 ns** | **0.0113** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** | **Overr(...)_Null [21]** | **283.63 ns** |  **7.693 ns** |  **4.024 ns** | **0.0114** |     **-** |     **-** |     **432 B** |
