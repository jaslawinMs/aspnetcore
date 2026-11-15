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
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |       **CustomStrategy** |     **173.7 ns** |      **3.08 ns** |      **1.61 ns** | **0.0070** |     **-** |     **-** |     **280 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** | **Decor(...)valid [24]** |   **2,021.4 ns** |    **241.36 ns** |    **126.23 ns** | **0.0385** |     **-** |     **-** |   **2,056 B** |
|     UnionBenchmark |      Validate | Job-JLDTLH |           16 | Decor(...)valid [24] |   9,848.1 ns |  1,123.24 ns |    587.48 ns | 0.1488 |     - |     - |   7,707 B |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |              **Depth16** |  **19,913.5 ns** |    **394.56 ns** |    **206.36 ns** | **0.1972** |     **-** |     **-** |  **13,649 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |               **Depth4** |   **5,771.8 ns** |    **316.21 ns** |    **165.38 ns** | **0.1103** |     **-** |     **-** |   **4,144 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |         **Depth64Valid** |  **80,205.4 ns** |  **4,580.99 ns** |  **2,395.94 ns** | **1.5625** |     **-** |     **-** |  **61,460 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |      **ExplicitInvalid** |   **8,525.7 ns** |    **127.42 ns** |     **66.65 ns** | **0.1687** |     **-** |     **-** |   **7,122 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |        **ExplicitValid** |   **8,272.4 ns** |    **165.00 ns** |     **86.30 ns** | **0.1640** |     **-** |     **-** |   **6,634 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |        **FilterEnabled** |   **2,024.2 ns** |     **57.84 ns** |     **30.25 ns** | **0.0409** |     **-** |     **-** |   **2,056 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |     **FilterSuppressed** |     **953.1 ns** |      **9.06 ns** |      **4.74 ns** | **0.0192** |     **-** |     **-** |     **928 B** |
| **UnionColdBenchmark** | **ValidateBatch** | **Job-ECNCJJ** |            **1** |      **FreshDeclared64** |  **92,350.2 ns** | **30,400.31 ns** | **15,899.95 ns** |      **-** |     **-** |     **-** |  **11,978 B** |
| **UnionColdBenchmark** | **ValidateBatch** | **Job-ECNCJJ** |            **1** |       **FreshDerived64** |  **40,347.3 ns** |  **6,999.53 ns** |  **3,660.89 ns** |      **-** |     **-** |     **-** |  **16,911 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** | **Impli(...)valid [22]** | **148,376.7 ns** |  **1,958.93 ns** |  **1,024.56 ns** | **2.9070** |     **-** |     **-** | **118,945 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** | **ImplicitArray64Valid** | **109,628.2 ns** |  **2,916.46 ns** |  **1,525.36 ns** | **2.1552** |     **-** |     **-** |  **86,415 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** | **Impli(...)valid [21]** |  **18,328.7 ns** |    **870.53 ns** |    **455.30 ns** | **0.3592** |     **-** |     **-** |  **15,377 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |  **ImplicitArray8Valid** |  **14,375.9 ns** |  **1,563.15 ns** |    **817.56 ns** | **0.2747** |     **-** |     **-** |  **11,145 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |          **ImplicitInt** |   **1,271.8 ns** |     **23.09 ns** |     **12.07 ns** | **0.0128** |     **-** |     **-** |     **768 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |      **ImplicitInvalid** |   **2,233.4 ns** |    **188.25 ns** |     **98.46 ns** | **0.0395** |     **-** |     **-** |   **2,056 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |        **ImplicitValid** |   **1,754.2 ns** |     **86.31 ns** |     **45.14 ns** | **0.0350** |     **-** |     **-** |   **1,568 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |     **InheritedInvalid** |   **2,005.4 ns** |     **48.49 ns** |     **25.36 ns** | **0.0397** |     **-** |     **-** |   **2,056 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |     **InterfaceMixed64** | **135,223.3 ns** |  **4,989.93 ns** |  **2,609.83 ns** | **2.6596** |     **-** |     **-** | **118,946 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |      **InterfaceMixed8** |  **15,900.8 ns** |    **478.82 ns** |    **250.43 ns** | **0.3133** |     **-** |     **-** |  **15,377 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |  **NamesakeCaseInvalid** |   **9,896.8 ns** |  **1,147.15 ns** |    **599.98 ns** | **0.1911** |     **-** |     **-** |   **7,706 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** | **Names(...)valid [23]** |   **9,816.3 ns** |    **585.00 ns** |    **305.96 ns** | **0.1863** |     **-** |     **-** |   **7,442 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |      **OverrideInvalid** |   **2,218.9 ns** |    **230.20 ns** |    **120.40 ns** | **0.0420** |     **-** |     **-** |   **2,056 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |     **PlainCheckedCase** |     **712.0 ns** |     **25.55 ns** |     **13.36 ns** | **0.0325** |     **-** |     **-** |   **1,392 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |          **PlainObject** |     **135.5 ns** |      **4.53 ns** |      **2.37 ns** | **0.0068** |     **-** |     **-** |     **256 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |      **SuppressedUnion** |   **7,347.2 ns** |    **166.06 ns** |     **86.85 ns** | **0.1504** |     **-** |     **-** |   **6,097 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |      **SuppressedValue** |     **916.3 ns** |     **22.14 ns** |     **11.58 ns** | **0.0183** |     **-** |     **-** |     **928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** | **TopLevelValueInvalid** |   **1,264.8 ns** |     **40.94 ns** |     **21.41 ns** | **0.0371** |     **-** |     **-** |   **1,384 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |               **Wide32** |   **7,543.6 ns** |    **191.45 ns** |    **100.13 ns** | **0.1510** |     **-** |     **-** |   **6,920 B** |
|     **UnionBenchmark** |      **Validate** | **Job-JLDTLH** |           **16** |                **Wide8** |   **3,380.0 ns** |     **40.53 ns** |     **21.20 ns** | **0.0745** |     **-** |     **-** |   **3,272 B** |
