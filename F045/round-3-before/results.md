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
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [23]** |   **7.780 ns** |  **0.2163 ns** |  **0.1131 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [22]** |   **7.633 ns** |  **0.1952 ns** |  **0.1021 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [21]** |   **7.760 ns** |  **0.1752 ns** |  **0.0917 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [24]** | **151.436 ns** |  **5.0840 ns** |  **2.6590 ns** | **0.0092** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [23]** | **145.977 ns** |  **5.1361 ns** |  **2.6863 ns** | **0.0078** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [22]** | **148.593 ns** |  **4.8365 ns** |  **2.5296 ns** | **0.0090** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [22]** |  **31.823 ns** |  **0.4631 ns** |  **0.2422 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [21]** |  **31.944 ns** |  **0.5788 ns** |  **0.3027 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **ClientOff_Valid_Null** |  **32.087 ns** |  **0.7331 ns** |  **0.3834 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [22]** | **186.121 ns** |  **2.4369 ns** |  **1.2745 ns** | **0.0076** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [21]** | **157.177 ns** |  **3.2237 ns** |  **1.6860 ns** | **0.0048** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **ClientOn_Absent_Null** | **159.930 ns** | **12.6102 ns** |  **6.5954 ns** | **0.0048** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [23]** | **243.897 ns** |  **5.1478 ns** |  **2.6924 ns** | **0.0099** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [22]** | **249.138 ns** | **13.0457 ns** |  **6.8232 ns** | **0.0100** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [21]** | **243.401 ns** |  **6.4323 ns** |  **3.3642 ns** | **0.0100** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [21]** | **205.729 ns** |  **7.3686 ns** |  **3.8539 ns** | **0.0082** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |           **0** | **ClientOn_Valid_Empty** | **172.992 ns** |  **3.1386 ns** |  **1.6416 ns** | **0.0052** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** |  **ClientOn_Valid_Null** | **170.796 ns** |  **1.8599 ns** |  **0.9728 ns** | **0.0053** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **Overr(...)ustom [23]** | **351.511 ns** |  **6.4205 ns** |  **3.3581 ns** | **0.0105** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |           **0** | **Overr(...)_Null [21]** | **354.613 ns** |  **9.8518 ns** |  **5.1527 ns** | **0.0107** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [23]** |  **22.928 ns** |  **0.7497 ns** |  **0.3921 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [22]** |  **22.518 ns** |  **0.5521 ns** |  **0.2888 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [21]** |  **22.915 ns** |  **0.9116 ns** |  **0.4768 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [24]** | **172.065 ns** |  **7.3020 ns** |  **3.8191 ns** | **0.0087** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [23]** | **174.141 ns** |  **5.8689 ns** |  **3.0695 ns** | **0.0089** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [22]** | **172.158 ns** |  **2.7166 ns** |  **1.4208 ns** | **0.0086** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [22]** |  **53.261 ns** |  **3.8055 ns** |  **1.9903 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [21]** |  **53.518 ns** |  **3.4611 ns** |  **1.8102 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **ClientOff_Valid_Null** |  **53.959 ns** |  **2.8123 ns** |  **1.4709 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [22]** | **227.643 ns** | **14.4853 ns** |  **7.5761 ns** | **0.0067** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [21]** | **198.768 ns** | **29.1331 ns** | **15.2372 ns** | **0.0058** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **ClientOn_Absent_Null** | **192.089 ns** |  **5.4658 ns** |  **2.8587 ns** | **0.0059** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [23]** | **259.099 ns** |  **3.3704 ns** |  **1.7628 ns** | **0.0082** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [22]** | **264.568 ns** |  **3.7577 ns** |  **1.9654 ns** | **0.0079** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [21]** | **267.207 ns** | **11.6959 ns** |  **6.1172 ns** | **0.0079** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [21]** | **223.179 ns** |  **6.3457 ns** |  **3.3189 ns** | **0.0069** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |          **63** | **ClientOn_Valid_Empty** | **198.985 ns** | **17.6091 ns** |  **9.2099 ns** | **0.0059** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** |  **ClientOn_Valid_Null** | **194.434 ns** |  **4.2865 ns** |  **2.2419 ns** | **0.0059** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **Overr(...)ustom [23]** | **367.037 ns** |  **2.4765 ns** |  **1.2953 ns** | **0.0111** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |          **63** | **Overr(...)_Null [21]** | **370.595 ns** | **11.3584 ns** |  **5.9406 ns** | **0.0112** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [23]** |  **26.558 ns** |  **0.4681 ns** |  **0.2448 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [22]** |  **26.796 ns** |  **0.5849 ns** |  **0.3059 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [21]** |  **26.609 ns** |  **0.4775 ns** |  **0.2497 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [24]** | **182.913 ns** | **24.6572 ns** | **12.8962 ns** | **0.0092** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [23]** | **176.124 ns** |  **7.6093 ns** |  **3.9798 ns** | **0.0074** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [22]** | **182.037 ns** |  **7.1669 ns** |  **3.7484 ns** | **0.0092** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [22]** |  **60.472 ns** |  **3.7444 ns** |  **1.9584 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [21]** |  **60.495 ns** |  **2.1301 ns** |  **1.1141 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **ClientOff_Valid_Null** |  **60.078 ns** |  **1.1402 ns** |  **0.5964 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [22]** | **223.685 ns** |  **4.2436 ns** |  **2.2195 ns** | **0.0068** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [21]** | **197.063 ns** |  **4.1775 ns** |  **2.1849 ns** | **0.0059** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **ClientOn_Absent_Null** | **197.533 ns** |  **2.8449 ns** |  **1.4879 ns** | **0.0060** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [23]** | **286.963 ns** | **30.1564 ns** | **15.7724 ns** | **0.0081** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [22]** | **273.323 ns** |  **4.2410 ns** |  **2.2181 ns** | **0.0083** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [21]** | **273.514 ns** |  **6.7178 ns** |  **3.5136 ns** | **0.0084** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [21]** | **233.983 ns** |  **3.8922 ns** |  **2.0357 ns** | **0.0070** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |         **255** | **ClientOn_Valid_Empty** | **203.985 ns** |  **4.8340 ns** |  **2.5283 ns** | **0.0042** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** |  **ClientOn_Valid_Null** | **204.507 ns** |  **4.0760 ns** |  **2.1318 ns** | **0.0041** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **Overr(...)ustom [23]** | **383.622 ns** |  **5.8727 ns** |  **3.0716 ns** | **0.0114** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |         **255** | **Overr(...)_Null [21]** | **388.007 ns** |  **8.6881 ns** |  **4.5441 ns** | **0.0078** |     **-** |     **-** |     **432 B** |
