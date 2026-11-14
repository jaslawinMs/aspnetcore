``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                    Method | OtherFields |                 Case |       Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------------------- |------------ |--------------------- |-----------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [23]** |   **8.033 ns** |  **0.3014 ns** |  **0.1576 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [22]** |   **7.817 ns** |  **0.5466 ns** |  **0.2859 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [21]** |   **7.852 ns** |  **0.1993 ns** |  **0.1043 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [24]** | **134.384 ns** |  **5.2005 ns** |  **2.7200 ns** | **0.0082** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [23]** | **137.761 ns** | **12.0339 ns** |  **6.2940 ns** | **0.0083** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [22]** | **138.968 ns** |  **6.1104 ns** |  **3.1959 ns** | **0.0084** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [22]** |  **32.738 ns** |  **1.1414 ns** |  **0.5969 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [21]** |  **31.326 ns** |  **0.4618 ns** |  **0.2415 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **ClientOff_Valid_Null** |  **31.853 ns** |  **0.3827 ns** |  **0.2001 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [22]** | **177.732 ns** |  **3.6574 ns** |  **1.9129 ns** | **0.0075** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [21]** | **161.154 ns** |  **9.1534 ns** |  **4.7874 ns** | **0.0048** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **ClientOn_Absent_Null** | **152.149 ns** |  **3.5066 ns** |  **1.8340 ns** | **0.0046** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [23]** | **236.727 ns** |  **7.5992 ns** |  **3.9745 ns** | **0.0096** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [22]** | **241.233 ns** |  **6.6807 ns** |  **3.4941 ns** | **0.0097** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [21]** | **239.134 ns** |  **3.4277 ns** |  **1.7927 ns** | **0.0098** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [21]** | **194.969 ns** |  **7.5678 ns** |  **3.9581 ns** | **0.0077** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |           **0** | **ClientOn_Valid_Empty** | **169.462 ns** |  **3.8248 ns** |  **2.0005 ns** | **0.0052** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** |  **ClientOn_Valid_Null** | **168.289 ns** |  **4.3978 ns** |  **2.3001 ns** | **0.0051** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **Overr(...)ustom [23]** | **355.031 ns** | **22.9878 ns** | **12.0231 ns** | **0.0105** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |           **0** | **Overr(...)_Null [21]** | **351.326 ns** |  **5.7568 ns** |  **3.0109 ns** | **0.0106** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [23]** |  **21.636 ns** |  **0.4025 ns** |  **0.2105 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [22]** |  **21.251 ns** |  **0.3393 ns** |  **0.1775 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [21]** |  **21.631 ns** |  **0.3799 ns** |  **0.1987 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [24]** | **156.685 ns** |  **5.8519 ns** |  **3.0607 ns** | **0.0092** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [23]** | **153.807 ns** |  **6.8452 ns** |  **3.5802 ns** | **0.0079** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [22]** | **156.463 ns** | **12.9402 ns** |  **6.7680 ns** | **0.0078** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [22]** |  **50.572 ns** |  **0.6988 ns** |  **0.3655 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [21]** |  **49.529 ns** |  **0.5528 ns** |  **0.2891 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **ClientOff_Valid_Null** |  **49.942 ns** |  **0.7296 ns** |  **0.3816 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [22]** | **210.332 ns** | **17.8344 ns** |  **9.3277 ns** | **0.0085** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [21]** | **181.343 ns** |  **2.3421 ns** |  **1.2250 ns** | **0.0055** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **ClientOn_Absent_Null** | **180.968 ns** |  **6.6918 ns** |  **3.4999 ns** | **0.0054** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [23]** | **261.373 ns** | **16.1289 ns** |  **8.4357 ns** | **0.0078** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [22]** | **255.391 ns** |  **6.4912 ns** |  **3.3950 ns** | **0.0080** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [21]** | **254.159 ns** |  **5.6704 ns** |  **2.9657 ns** | **0.0078** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [21]** | **219.276 ns** |  **9.5912 ns** |  **5.0164 ns** | **0.0088** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |          **63** | **ClientOn_Valid_Empty** | **193.173 ns** | **19.5599 ns** | **10.2302 ns** | **0.0058** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** |  **ClientOn_Valid_Null** | **189.664 ns** |  **2.9925 ns** |  **1.5651 ns** | **0.0058** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **Overr(...)ustom [23]** | **373.607 ns** |  **8.5142 ns** |  **4.4531 ns** | **0.0112** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |          **63** | **Overr(...)_Null [21]** | **378.983 ns** | **10.2573 ns** |  **5.3648 ns** | **0.0114** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [23]** |  **25.024 ns** |  **0.5019 ns** |  **0.2625 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [22]** |  **24.690 ns** |  **0.3589 ns** |  **0.1877 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [21]** |  **24.795 ns** |  **0.3017 ns** |  **0.1578 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [24]** | **160.462 ns** |  **4.3283 ns** |  **2.2638 ns** | **0.0083** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [23]** | **165.909 ns** | **17.3008 ns** |  **9.0486 ns** | **0.0083** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [22]** | **162.978 ns** |  **9.0635 ns** |  **4.7404 ns** | **0.0082** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [22]** |  **56.247 ns** |  **0.6299 ns** |  **0.3294 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [21]** |  **56.110 ns** |  **0.6801 ns** |  **0.3557 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **ClientOff_Valid_Null** |  **56.266 ns** |  **0.9080 ns** |  **0.4749 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [22]** | **225.501 ns** | **12.9387 ns** |  **6.7672 ns** | **0.0089** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [21]** | **195.230 ns** |  **2.5878 ns** |  **1.3535 ns** | **0.0059** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **ClientOn_Absent_Null** | **188.948 ns** |  **2.8868 ns** |  **1.5099 ns** | **0.0058** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [23]** | **265.715 ns** |  **6.5781 ns** |  **3.4405 ns** | **0.0081** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [22]** | **264.764 ns** |  **5.3815 ns** |  **2.8146 ns** | **0.0081** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [21]** | **260.387 ns** |  **4.6686 ns** |  **2.4418 ns** | **0.0079** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [21]** | **229.154 ns** |  **3.7492 ns** |  **1.9609 ns** | **0.0090** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |         **255** | **ClientOn_Valid_Empty** | **200.030 ns** |  **5.5692 ns** |  **2.9128 ns** | **0.0060** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** |  **ClientOn_Valid_Null** | **200.523 ns** |  **4.8009 ns** |  **2.5109 ns** | **0.0059** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **Overr(...)ustom [23]** | **378.812 ns** | **15.9983 ns** |  **8.3674 ns** | **0.0079** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |         **255** | **Overr(...)_Null [21]** | **388.547 ns** | **23.3937 ns** | **12.2353 ns** | **0.0114** |     **-** |     **-** |     **432 B** |
