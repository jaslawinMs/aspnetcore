``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                    Method | OtherFields |                 Case |       Mean |      Error |     StdDev |     Median |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------------------- |------------ |--------------------- |-----------:|-----------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [23]** |  **51.691 ns** | **69.8107 ns** | **36.5124 ns** |  **75.969 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [22]** |   **7.667 ns** |  **0.1438 ns** |  **0.0752 ns** |   **7.673 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [21]** |   **7.747 ns** |  **0.1178 ns** |  **0.0616 ns** |   **7.775 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [24]** | **119.256 ns** |  **6.9721 ns** |  **3.6466 ns** | **118.208 ns** | **0.0086** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [23]** | **123.512 ns** |  **8.0036 ns** |  **4.1861 ns** | **123.235 ns** | **0.0087** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [22]** | **121.870 ns** |  **3.2544 ns** |  **1.7021 ns** | **121.536 ns** | **0.0087** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [22]** |  **18.346 ns** |  **0.1770 ns** |  **0.0926 ns** |  **18.310 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [21]** |  **18.730 ns** |  **0.2318 ns** |  **0.1212 ns** |  **18.750 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **ClientOff_Valid_Null** |  **18.809 ns** |  **0.4805 ns** |  **0.2513 ns** |  **18.745 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [22]** | **173.569 ns** |  **5.6458 ns** |  **2.9529 ns** | **172.706 ns** | **0.0087** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [21]** | **146.639 ns** |  **3.1516 ns** |  **1.6483 ns** | **145.819 ns** | **0.0059** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **ClientOn_Absent_Null** | **146.493 ns** |  **1.4228 ns** |  **0.7442 ns** | **146.574 ns** | **0.0059** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [23]** | **217.609 ns** |  **7.2181 ns** |  **3.7752 ns** | **216.954 ns** | **0.0088** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [22]** | **223.203 ns** | **10.5645 ns** |  **5.5254 ns** | **222.289 ns** | **0.0088** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [21]** | **219.300 ns** |  **6.0203 ns** |  **3.1487 ns** | **219.531 ns** | **0.0088** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [21]** | **185.499 ns** |  **5.1258 ns** |  **2.6809 ns** | **185.005 ns** | **0.0089** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |           **0** | **ClientOn_Valid_Empty** | **151.597 ns** |  **5.1582 ns** |  **2.6978 ns** | **150.755 ns** | **0.0047** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** |  **ClientOn_Valid_Null** | **153.926 ns** |  **8.4701 ns** |  **4.4300 ns** | **152.522 ns** | **0.0047** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **Overr(...)ustom [23]** | **329.916 ns** |  **8.6679 ns** |  **4.5335 ns** | **329.117 ns** | **0.0100** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |           **0** | **Overr(...)_Null [21]** | **333.787 ns** |  **6.5414 ns** |  **3.4213 ns** | **333.085 ns** | **0.0100** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [23]** |  **22.371 ns** |  **0.1734 ns** |  **0.0907 ns** |  **22.367 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [22]** |  **22.617 ns** |  **0.4404 ns** |  **0.2303 ns** |  **22.539 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [21]** |  **23.265 ns** |  **1.2666 ns** |  **0.6625 ns** |  **23.163 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [24]** | **129.537 ns** |  **5.9505 ns** |  **3.1122 ns** | **129.141 ns** | **0.0080** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [23]** | **130.886 ns** |  **4.0626 ns** |  **2.1248 ns** | **130.658 ns** | **0.0081** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [22]** | **131.135 ns** |  **4.8155 ns** |  **2.5186 ns** | **130.331 ns** | **0.0080** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [22]** |  **28.838 ns** |  **0.3637 ns** |  **0.1902 ns** |  **28.839 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [21]** |  **28.450 ns** |  **0.3822 ns** |  **0.1999 ns** |  **28.488 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **ClientOff_Valid_Null** |  **28.671 ns** |  **0.3851 ns** |  **0.2014 ns** |  **28.658 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [22]** | **201.054 ns** | **24.4914 ns** | **12.8095 ns** | **195.463 ns** | **0.0077** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [21]** | **163.900 ns** |  **5.6581 ns** |  **2.9593 ns** | **163.404 ns** | **0.0050** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **ClientOn_Absent_Null** | **163.265 ns** |  **6.9349 ns** |  **3.6271 ns** | **162.493 ns** | **0.0050** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [23]** | **235.956 ns** | **13.1778 ns** |  **6.8923 ns** | **233.829 ns** | **0.0094** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [22]** | **232.478 ns** |  **9.6621 ns** |  **5.0535 ns** | **231.336 ns** | **0.0094** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [21]** | **231.377 ns** |  **6.3716 ns** |  **3.3325 ns** | **230.620 ns** | **0.0095** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [21]** | **189.901 ns** |  **3.9755 ns** |  **2.0793 ns** | **189.575 ns** | **0.0077** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |          **63** | **ClientOn_Valid_Empty** | **163.542 ns** |  **2.7160 ns** |  **1.4205 ns** | **163.806 ns** | **0.0050** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** |  **ClientOn_Valid_Null** | **167.834 ns** |  **5.7937 ns** |  **3.0302 ns** | **168.258 ns** | **0.0051** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **Overr(...)ustom [23]** | **345.009 ns** | **10.4390 ns** |  **5.4598 ns** | **342.254 ns** | **0.0103** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |          **63** | **Overr(...)_Null [21]** | **348.271 ns** |  **7.7527 ns** |  **4.0548 ns** | **347.990 ns** | **0.0105** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [23]** |  **26.759 ns** |  **0.5155 ns** |  **0.2696 ns** |  **26.651 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [22]** |  **26.611 ns** |  **0.2123 ns** |  **0.1111 ns** |  **26.577 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [21]** |  **26.541 ns** |  **0.4539 ns** |  **0.2374 ns** |  **26.536 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [24]** | **133.575 ns** |  **5.7395 ns** |  **3.0019 ns** | **132.588 ns** | **0.0083** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [23]** | **135.542 ns** |  **4.0412 ns** |  **2.1136 ns** | **135.325 ns** | **0.0083** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [22]** | **134.537 ns** |  **6.1132 ns** |  **3.1973 ns** | **134.475 ns** | **0.0082** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [22]** |  **32.361 ns** |  **0.4062 ns** |  **0.2124 ns** |  **32.346 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [21]** |  **32.689 ns** |  **0.8207 ns** |  **0.4292 ns** |  **32.558 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **ClientOff_Valid_Null** |  **33.488 ns** |  **0.5894 ns** |  **0.3083 ns** |  **33.393 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [22]** | **188.983 ns** |  **5.0276 ns** |  **2.6296 ns** | **188.892 ns** | **0.0076** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [21]** | **163.180 ns** |  **4.4187 ns** |  **2.3111 ns** | **162.457 ns** | **0.0049** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **ClientOn_Absent_Null** | **164.526 ns** |  **4.3518 ns** |  **2.2761 ns** | **165.048 ns** | **0.0050** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [23]** | **233.838 ns** |  **6.1367 ns** |  **3.2096 ns** | **233.436 ns** | **0.0098** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [22]** | **238.552 ns** |  **6.3392 ns** |  **3.3155 ns** | **237.964 ns** | **0.0095** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [21]** | **239.089 ns** |  **5.6860 ns** |  **2.9739 ns** | **239.809 ns** | **0.0098** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [21]** | **202.594 ns** | **17.1745 ns** |  **8.9826 ns** | **199.555 ns** | **0.0079** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |         **255** | **ClientOn_Valid_Empty** | **170.305 ns** |  **6.3014 ns** |  **3.2957 ns** | **169.165 ns** | **0.0052** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** |  **ClientOn_Valid_Null** | **170.048 ns** |  **4.3588 ns** |  **2.2797 ns** | **170.112 ns** | **0.0054** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **Overr(...)ustom [23]** | **351.371 ns** | **12.9620 ns** |  **6.7794 ns** | **348.759 ns** | **0.0107** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |         **255** | **Overr(...)_Null [21]** | **350.843 ns** |  **6.5636 ns** |  **3.4329 ns** | **350.561 ns** | **0.0106** |     **-** |     **-** |     **432 B** |
