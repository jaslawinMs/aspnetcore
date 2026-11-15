``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  InvocationCount=1  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
WarmupCount=3  

```
|               Type |        Method |        Job | UnrollFactor |                 Case |         Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------- |-------------- |----------- |------------- |--------------------- |-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |       **CustomStrategy** |     **177.9 ns** |     **15.42 ns** |      **8.06 ns** | **0.0068** |     **-** |     **-** |     **280 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** | **Decor(...)valid [24]** |   **1,943.0 ns** |     **28.84 ns** |     **15.08 ns** | **0.0393** |     **-** |     **-** |   **2,056 B** |
|     UnionBenchmark |      Validate | Job-TWSRXJ |           16 | Decor(...)valid [24] |   9,832.3 ns |    543.30 ns |    284.16 ns | 0.1528 |     - |     - |   7,763 B |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |              **Depth16** |  **20,174.8 ns** |    **693.72 ns** |    **362.83 ns** | **0.2070** |     **-** |     **-** |  **13,649 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |               **Depth4** |   **5,761.8 ns** |    **228.70 ns** |    **119.62 ns** | **0.0562** |     **-** |     **-** |   **4,144 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |         **Depth64Valid** |  **82,141.6 ns** |  **7,722.30 ns** |  **4,038.91 ns** | **1.6234** |     **-** |     **-** |  **61,461 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |      **ExplicitInvalid** |   **8,716.9 ns** |    **326.68 ns** |    **170.86 ns** | **0.1731** |     **-** |     **-** |   **7,178 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |        **ExplicitValid** |   **8,316.6 ns** |    **238.35 ns** |    **124.66 ns** | **0.1662** |     **-** |     **-** |   **6,690 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |        **FilterEnabled** |   **1,990.6 ns** |     **34.72 ns** |     **18.16 ns** | **0.0390** |     **-** |     **-** |   **2,056 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |     **FilterSuppressed** |     **930.7 ns** |     **12.88 ns** |      **6.74 ns** | **0.0186** |     **-** |     **-** |     **928 B** |
| **UnionColdBenchmark** | **ValidateBatch** | **Job-DQHMFE** |            **1** |      **FreshDeclared64** |  **92,065.0 ns** | **26,762.91 ns** | **13,997.52 ns** |      **-** |     **-** |     **-** |  **11,459 B** |
| **UnionColdBenchmark** | **ValidateBatch** | **Job-DQHMFE** |            **1** |       **FreshDerived64** |  **37,764.6 ns** |  **5,172.33 ns** |  **2,705.23 ns** |      **-** |     **-** |     **-** |  **16,890 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** | **Impli(...)valid [22]** | **149,218.3 ns** |  **5,660.59 ns** |  **2,960.60 ns** | **2.9070** |     **-** |     **-** | **118,945 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** | **ImplicitArray64Valid** | **112,689.4 ns** |  **5,964.77 ns** |  **3,119.69 ns** | **2.1186** |     **-** |     **-** |  **86,415 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** | **Impli(...)valid [21]** |  **17,470.7 ns** |    **603.34 ns** |    **315.56 ns** | **0.3511** |     **-** |     **-** |  **15,377 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |  **ImplicitArray8Valid** |  **13,914.1 ns** |    **520.29 ns** |    **272.12 ns** | **0.2765** |     **-** |     **-** |  **11,145 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |          **ImplicitInt** |   **1,286.3 ns** |     **34.20 ns** |     **17.89 ns** | **0.0127** |     **-** |     **-** |     **768 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |      **ImplicitInvalid** |   **1,977.8 ns** |     **67.78 ns** |     **35.45 ns** | **0.0393** |     **-** |     **-** |   **2,056 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |        **ImplicitValid** |   **1,777.6 ns** |     **75.76 ns** |     **39.62 ns** | **0.0353** |     **-** |     **-** |   **1,568 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |     **InheritedInvalid** |   **2,061.2 ns** |    **237.21 ns** |    **124.06 ns** | **0.0435** |     **-** |     **-** |   **2,056 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |     **InterfaceMixed64** | **134,757.8 ns** |  **3,710.89 ns** |  **1,940.87 ns** | **2.7174** |     **-** |     **-** | **118,946 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |      **InterfaceMixed8** |  **15,923.5 ns** |    **927.91 ns** |    **485.32 ns** | **0.3117** |     **-** |     **-** |  **15,377 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |  **NamesakeCaseInvalid** |   **9,712.9 ns** |    **140.68 ns** |     **73.58 ns** | **0.1914** |     **-** |     **-** |   **7,762 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** | **Names(...)valid [23]** |   **9,577.4 ns** |    **147.23 ns** |     **77.01 ns** | **0.1888** |     **-** |     **-** |   **7,498 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |      **OverrideInvalid** |   **2,097.0 ns** |     **37.50 ns** |     **19.61 ns** | **0.0415** |     **-** |     **-** |   **2,056 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |     **PlainCheckedCase** |     **820.3 ns** |    **132.48 ns** |     **69.29 ns** | **0.0308** |     **-** |     **-** |   **1,392 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |          **PlainObject** |     **143.1 ns** |     **21.45 ns** |     **11.22 ns** | **0.0068** |     **-** |     **-** |     **256 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |      **SuppressedUnion** |   **7,351.4 ns** |    **532.29 ns** |    **278.40 ns** | **0.1481** |     **-** |     **-** |   **6,153 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |      **SuppressedValue** |     **964.0 ns** |     **30.17 ns** |     **15.78 ns** | **0.0183** |     **-** |     **-** |     **928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** | **TopLevelValueInvalid** |   **1,324.9 ns** |    **111.71 ns** |     **58.42 ns** | **0.0258** |     **-** |     **-** |   **1,384 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |               **Wide32** |   **8,007.3 ns** |    **157.06 ns** |     **82.15 ns** | **0.1586** |     **-** |     **-** |   **6,921 B** |
|     **UnionBenchmark** |      **Validate** | **Job-TWSRXJ** |           **16** |                **Wide8** |   **3,780.8 ns** |    **229.27 ns** |    **119.91 ns** | **0.0697** |     **-** |     **-** |   **3,272 B** |
