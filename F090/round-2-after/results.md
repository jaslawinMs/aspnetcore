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
| **GenerateValidationMessage** | **Clien(...)ustom [24]** |  **92.39 ns** | **11.925 ns** | **6.237 ns** | **0.0092** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [23]** |  **91.93 ns** |  **4.726 ns** | **2.472 ns** | **0.0088** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [22]** |  **87.62 ns** |  **2.450 ns** | **1.281 ns** | **0.0086** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [22]** |  **19.81 ns** |  **0.369 ns** | **0.193 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)Empty [21]** |  **19.75 ns** |  **0.424 ns** | **0.222 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **ClientOff_Valid_Null** |  **19.80 ns** |  **0.317 ns** | **0.166 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** | **Clien(...)ustom [23]** | **174.52 ns** | **15.757 ns** | **8.241 ns** | **0.0084** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)Empty [22]** | **186.25 ns** |  **5.922 ns** | **3.097 ns** | **0.0077** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)_Null [21]** | **170.74 ns** |  **4.280 ns** | **2.239 ns** | **0.0087** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** | **Clien(...)ustom [21]** | **158.54 ns** |  **8.494 ns** | **4.443 ns** | **0.0077** |     **-** |     **-** |     **304 B** |
| **GenerateValidationMessage** | **ClientOn_Valid_Empty** | **127.87 ns** |  **2.522 ns** | **1.319 ns** | **0.0040** |     **-** |     **-** |     **192 B** |
| **GenerateValidationMessage** |  **ClientOn_Valid_Null** | **130.52 ns** |  **9.015 ns** | **4.715 ns** | **0.0040** |     **-** |     **-** |     **192 B** |
| **GenerateValidationMessage** | **Overr(...)ustom [23]** | **264.77 ns** | **10.884 ns** | **5.692 ns** | **0.0105** |     **-** |     **-** |     **400 B** |
| **GenerateValidationMessage** | **Overr(...)_Null [21]** | **270.46 ns** | **10.175 ns** | **5.322 ns** | **0.0107** |     **-** |     **-** |     **400 B** |
