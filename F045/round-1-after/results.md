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
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [23]** |   **8.195 ns** |  **0.4683 ns** |  **0.2449 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [22]** |   **8.056 ns** |  **0.1885 ns** |  **0.0986 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [21]** |   **8.005 ns** |  **0.0829 ns** |  **0.0434 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [24]** | **120.000 ns** |  **6.6953 ns** |  **3.5018 ns** | **0.0083** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [23]** | **123.121 ns** |  **8.6591 ns** |  **4.5289 ns** | **0.0086** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [22]** | **127.092 ns** |  **6.2761 ns** |  **3.2825 ns** | **0.0090** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [22]** |  **17.454 ns** |  **0.2223 ns** |  **0.1163 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [21]** |  **17.618 ns** |  **0.1665 ns** |  **0.0871 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **ClientOff_Valid_Null** |  **17.599 ns** |  **0.1605 ns** |  **0.0840 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [22]** | **171.084 ns** |  **4.8089 ns** |  **2.5151 ns** | **0.0086** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [21]** | **148.168 ns** |  **3.5666 ns** |  **1.8654 ns** | **0.0059** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **ClientOn_Absent_Null** | **146.852 ns** |  **2.9734 ns** |  **1.5552 ns** | **0.0059** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [23]** | **218.213 ns** | **12.1693 ns** |  **6.3648 ns** | **0.0089** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)Empty [22]** | **220.358 ns** |  **4.2801 ns** |  **2.2386 ns** | **0.0091** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)_Null [21]** | **217.648 ns** |  **3.8685 ns** |  **2.0233 ns** | **0.0088** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |           **0** | **Clien(...)ustom [21]** | **179.630 ns** | **13.7240 ns** |  **7.1779 ns** | **0.0073** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |           **0** | **ClientOn_Valid_Empty** | **157.734 ns** | **10.9600 ns** |  **5.7323 ns** | **0.0047** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** |  **ClientOn_Valid_Null** | **153.448 ns** |  **6.2673 ns** |  **3.2779 ns** | **0.0046** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |           **0** | **Overr(...)ustom [23]** | **323.723 ns** | **10.2058 ns** |  **5.3379 ns** | **0.0098** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |           **0** | **Overr(...)_Null [21]** | **325.965 ns** |  **9.4391 ns** |  **4.9368 ns** | **0.0100** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [23]** |  **20.783 ns** |  **0.1616 ns** |  **0.0845 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [22]** |  **21.093 ns** |  **0.5463 ns** |  **0.2857 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [21]** |  **20.946 ns** |  **0.6407 ns** |  **0.3351 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [24]** | **138.158 ns** | **11.1366 ns** |  **5.8247 ns** | **0.0092** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [23]** | **129.190 ns** |  **3.8071 ns** |  **1.9912 ns** | **0.0083** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [22]** | **129.976 ns** |  **9.6158 ns** |  **5.0293 ns** | **0.0080** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [22]** |  **26.288 ns** |  **0.5909 ns** |  **0.3091 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [21]** |  **26.036 ns** |  **0.2770 ns** |  **0.1449 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **ClientOff_Valid_Null** |  **27.385 ns** |  **2.6130 ns** |  **1.3667 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [22]** | **188.162 ns** | **12.6157 ns** |  **6.5983 ns** | **0.0075** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [21]** | **158.036 ns** |  **5.0153 ns** |  **2.6231 ns** | **0.0049** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **ClientOn_Absent_Null** | **159.239 ns** | **13.7530 ns** |  **7.1931 ns** | **0.0048** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [23]** | **227.139 ns** |  **6.5366 ns** |  **3.4188 ns** | **0.0093** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)Empty [22]** | **229.421 ns** |  **2.7920 ns** |  **1.4603 ns** | **0.0092** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)_Null [21]** | **232.284 ns** |  **5.2626 ns** |  **2.7524 ns** | **0.0095** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |          **63** | **Clien(...)ustom [21]** | **187.984 ns** |  **6.0574 ns** |  **3.1681 ns** | **0.0077** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |          **63** | **ClientOn_Valid_Empty** | **162.651 ns** |  **5.3180 ns** |  **2.7814 ns** | **0.0050** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** |  **ClientOn_Valid_Null** | **161.134 ns** |  **3.1661 ns** |  **1.6559 ns** | **0.0049** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |          **63** | **Overr(...)ustom [23]** | **337.098 ns** |  **7.2017 ns** |  **3.7667 ns** | **0.0100** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |          **63** | **Overr(...)_Null [21]** | **340.546 ns** |  **5.2132 ns** |  **2.7266 ns** | **0.0102** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [23]** |  **24.038 ns** |  **0.3341 ns** |  **0.1747 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [22]** |  **24.074 ns** |  **0.2513 ns** |  **0.1315 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [21]** |  **24.745 ns** |  **1.2463 ns** |  **0.6518 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [24]** | **134.058 ns** | **10.2368 ns** |  **5.3540 ns** | **0.0082** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [23]** | **140.128 ns** | **16.7433 ns** |  **8.7571 ns** | **0.0080** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [22]** | **132.914 ns** |  **3.8640 ns** |  **2.0210 ns** | **0.0084** |     **-** |     **-** |     **344 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [22]** |  **29.239 ns** |  **0.6118 ns** |  **0.3200 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [21]** |  **29.293 ns** |  **0.7112 ns** |  **0.3720 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **ClientOff_Valid_Null** |  **29.345 ns** |  **0.4961 ns** |  **0.2595 ns** |      **-** |     **-** |     **-** |         **-** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [22]** | **186.458 ns** |  **5.0300 ns** |  **2.6308 ns** | **0.0076** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [21]** | **161.568 ns** |  **4.6580 ns** |  **2.4362 ns** | **0.0049** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **ClientOn_Absent_Null** | **159.943 ns** |  **8.8946 ns** |  **4.6520 ns** | **0.0053** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [23]** | **222.112 ns** |  **8.4819 ns** |  **4.4362 ns** | **0.0089** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)Empty [22]** | **228.407 ns** |  **7.4776 ns** |  **3.9109 ns** | **0.0093** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)_Null [21]** | **227.744 ns** |  **5.3979 ns** |  **2.8232 ns** | **0.0091** |     **-** |     **-** |     **376 B** |
| **GenerateValidationMessage** |         **255** | **Clien(...)ustom [21]** | **185.942 ns** |  **7.4208 ns** |  **3.8812 ns** | **0.0074** |     **-** |     **-** |     **336 B** |
| **GenerateValidationMessage** |         **255** | **ClientOn_Valid_Empty** | **161.307 ns** |  **4.4279 ns** |  **2.3159 ns** | **0.0050** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** |  **ClientOn_Valid_Null** | **161.589 ns** |  **6.8480 ns** |  **3.5817 ns** | **0.0051** |     **-** |     **-** |     **224 B** |
| **GenerateValidationMessage** |         **255** | **Overr(...)ustom [23]** | **331.582 ns** | **23.4876 ns** | **12.2845 ns** | **0.0100** |     **-** |     **-** |     **432 B** |
| **GenerateValidationMessage** |         **255** | **Overr(...)_Null [21]** | **327.952 ns** |  **7.6901 ns** |  **4.0221 ns** | **0.0100** |     **-** |     **-** |     **432 B** |
