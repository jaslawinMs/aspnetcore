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
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [23]** |  **40.423 ns** | **67.2091 ns** | **35.1517 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [22]** |   **7.829 ns** |  **0.2150 ns** |  **0.1124 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [21]** |   **7.828 ns** |  **0.1166 ns** |  **0.0610 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [24]** | **145.164 ns** | **11.3381 ns** |  **5.9300 ns** | **0.0085** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [23]** | **153.677 ns** |  **3.2943 ns** |  **1.7230 ns** | **0.0092** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [22]** | **158.356 ns** | **26.2305 ns** | **13.7190 ns** | **0.0078** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [22]** |  **31.592 ns** |  **0.4875 ns** |  **0.2550 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [21]** |  **31.689 ns** |  **0.4710 ns** |  **0.2463 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **ClientOff_Valid_Null** |  **31.681 ns** |  **0.6074 ns** |  **0.3177 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [22]** | **190.595 ns** |  **4.3265 ns** |  **2.2629 ns** | **0.0076** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [21]** | **161.346 ns** |  **2.7500 ns** |  **1.4383 ns** | **0.0048** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **ClientOn_Absent_Null** | **158.410 ns** | **13.9184 ns** |  **7.2796 ns** | **0.0050** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [23]** | **253.555 ns** |  **3.3030 ns** |  **1.7275 ns** | **0.0078** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [22]** | **252.187 ns** |  **4.0244 ns** |  **2.1049 ns** | **0.0079** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [21]** | **253.810 ns** |  **2.5803 ns** |  **1.3496 ns** | **0.0077** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [21]** | **212.283 ns** |  **4.6326 ns** |  **2.4229 ns** | **0.0086** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |           **0** | **ClientOn_Valid_Empty** | **178.348 ns** |  **2.8402 ns** |  **1.4855 ns** | **0.0055** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** |  **ClientOn_Valid_Null** | **179.617 ns** | **10.4786 ns** |  **5.4805 ns** | **0.0055** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **Overr(...)ustom [23]** | **363.848 ns** |  **5.0752 ns** |  **2.6544 ns** | **0.0110** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |           **0** | **Overr(...)_Null [21]** | **363.912 ns** |  **8.2043 ns** |  **4.2910 ns** | **0.0109** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [23]** |  **21.813 ns** |  **0.3504 ns** |  **0.1833 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [22]** |  **21.789 ns** |  **0.2444 ns** |  **0.1278 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [21]** |  **21.691 ns** |  **0.3047 ns** |  **0.1593 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [24]** | **165.395 ns** |  **5.8023 ns** |  **3.0347 ns** | **0.0084** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [23]** | **167.069 ns** |  **4.8386 ns** |  **2.5307 ns** | **0.0085** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [22]** | **165.571 ns** |  **4.2295 ns** |  **2.2121 ns** | **0.0084** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [22]** |  **49.035 ns** |  **0.4678 ns** |  **0.2447 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [21]** |  **49.041 ns** |  **0.6884 ns** |  **0.3601 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **ClientOff_Valid_Null** |  **49.339 ns** |  **0.5569 ns** |  **0.2913 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [22]** | **226.788 ns** | **12.0026 ns** |  **6.2776 ns** | **0.0090** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [21]** | **188.830 ns** |  **6.0441 ns** |  **3.1612 ns** | **0.0057** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **ClientOn_Absent_Null** | **190.757 ns** |  **5.1350 ns** |  **2.6857 ns** | **0.0057** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [23]** | **274.942 ns** | **10.0235 ns** |  **5.2425 ns** | **0.0083** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [22]** | **281.223 ns** |  **9.1807 ns** |  **4.8017 ns** | **0.0084** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [21]** | **276.965 ns** |  **4.3234 ns** |  **2.2612 ns** | **0.0083** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [21]** | **230.453 ns** |  **6.3314 ns** |  **3.3114 ns** | **0.0070** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |          **63** | **ClientOn_Valid_Empty** | **197.190 ns** |  **3.3725 ns** |  **1.7639 ns** | **0.0040** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** |  **ClientOn_Valid_Null** | **196.332 ns** |  **3.0716 ns** |  **1.6065 ns** | **0.0041** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **Overr(...)ustom [23]** | **386.975 ns** | **10.0616 ns** |  **5.2624 ns** | **0.0078** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |          **63** | **Overr(...)_Null [21]** | **389.403 ns** | **27.9531 ns** | **14.6200 ns** | **0.0078** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [23]** |  **24.636 ns** |  **0.3571 ns** |  **0.1868 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [22]** |  **25.137 ns** |  **0.3546 ns** |  **0.1854 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [21]** |  **24.957 ns** |  **0.3086 ns** |  **0.1614 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [24]** | **173.274 ns** |  **9.7699 ns** |  **5.1098 ns** | **0.0087** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [23]** | **177.044 ns** |  **4.0302 ns** |  **2.1079 ns** | **0.0090** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [22]** | **177.276 ns** | **14.7249 ns** |  **7.7014 ns** | **0.0088** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [22]** |  **56.006 ns** |  **0.8917 ns** |  **0.4664 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [21]** |  **55.362 ns** |  **0.8831 ns** |  **0.4619 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **ClientOff_Valid_Null** |  **55.862 ns** |  **0.6014 ns** |  **0.3145 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [22]** | **225.961 ns** |  **5.6206 ns** |  **2.9397 ns** | **0.0090** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [21]** | **195.760 ns** |  **3.4967 ns** |  **1.8288 ns** | **0.0060** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **ClientOn_Absent_Null** | **200.100 ns** | **11.3880 ns** |  **5.9561 ns** | **0.0060** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [23]** | **275.184 ns** |  **6.1396 ns** |  **3.2111 ns** | **0.0083** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [22]** | **276.090 ns** |  **4.5710 ns** |  **2.3907 ns** | **0.0083** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [21]** | **275.947 ns** |  **4.5205 ns** |  **2.3643 ns** | **0.0084** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [21]** | **224.117 ns** |  **6.5028 ns** |  **3.4011 ns** | **0.0068** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |         **255** | **ClientOn_Valid_Empty** | **195.692 ns** |  **4.6381 ns** |  **2.4258 ns** | **0.0040** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** |  **ClientOn_Valid_Null** | **192.629 ns** |  **4.7266 ns** |  **2.4721 ns** | **0.0040** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **Overr(...)ustom [23]** | **374.007 ns** |  **8.0552 ns** |  **4.2130 ns** | **0.0078** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |         **255** | **Overr(...)_Null [21]** | **388.450 ns** |  **3.9047 ns** |  **2.0422 ns** | **0.0115** |     **-** |     **-** |     **432 B** |
