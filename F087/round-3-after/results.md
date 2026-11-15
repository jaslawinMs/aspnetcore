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
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |       **CustomStrategy** |     **171.6 ns** |      **3.23 ns** |      **1.69 ns** | **0.0069** |     **-** |     **-** |     **280 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** | **Decor(...)valid [24]** |   **1,446.8 ns** |     **54.82 ns** |     **28.67 ns** | **0.0428** |     **-** |     **-** |   **1,928 B** |
|     UnionBenchmark |      Validate | Job-WVLOHX |           16 | Decor(...)valid [24] |  11,241.0 ns |  4,575.53 ns |  2,393.09 ns | 0.1430 |     - |     - |   7,514 B |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |              **Depth16** |  **11,875.8 ns** |     **81.74 ns** |     **42.75 ns** | **0.2376** |     **-** |     **-** |  **11,601 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |               **Depth4** |   **3,519.2 ns** |     **38.80 ns** |     **20.30 ns** | **0.0706** |     **-** |     **-** |   **3,632 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |         **Depth64Valid** |  **46,693.8 ns** |  **1,301.34 ns** |    **680.62 ns** | **1.4098** |     **-** |     **-** |  **53,267 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |      **ExplicitInvalid** |   **7,941.9 ns** |     **74.63 ns** |     **39.03 ns** | **0.1582** |     **-** |     **-** |   **7,058 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |        **ExplicitValid** |   **7,762.9 ns** |    **214.29 ns** |    **112.08 ns** | **0.1559** |     **-** |     **-** |   **6,570 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |        **FilterEnabled** |   **1,458.3 ns** |     **47.40 ns** |     **24.79 ns** | **0.0434** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |     **FilterSuppressed** |     **684.9 ns** |     **14.98 ns** |      **7.83 ns** | **0.0201** |     **-** |     **-** |     **864 B** |
| **UnionColdBenchmark** | **ValidateBatch** | **Job-SCKWJI** |            **1** |      **FreshDeclared64** |  **96,806.6 ns** | **26,680.48 ns** | **13,954.41 ns** |      **-** |     **-** |     **-** |  **11,532 B** |
| **UnionColdBenchmark** | **ValidateBatch** | **Job-SCKWJI** |            **1** |       **FreshDerived64** |  **40,236.7 ns** |  **6,976.62 ns** |  **3,648.91 ns** |      **-** |     **-** |     **-** |  **17,601 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** | **Impli(...)valid [22]** | **112,329.5 ns** |  **4,104.82 ns** |  **2,146.90 ns** | **2.3585** |     **-** |     **-** | **110,751 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** | **ImplicitArray64Valid** |  **73,031.5 ns** |  **1,980.79 ns** |  **1,035.99 ns** | **1.4368** |     **-** |     **-** |  **78,221 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** | **Impli(...)valid [21]** |  **13,349.1 ns** |    **799.73 ns** |    **418.28 ns** | **0.2626** |     **-** |     **-** |  **14,353 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |  **ImplicitArray8Valid** |   **9,535.8 ns** |    **178.38 ns** |     **93.29 ns** | **0.1962** |     **-** |     **-** |  **10,121 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |          **ImplicitInt** |     **802.6 ns** |     **42.71 ns** |     **22.34 ns** | **0.0157** |     **-** |     **-** |     **640 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |      **ImplicitInvalid** |   **1,480.9 ns** |    **162.91 ns** |     **85.20 ns** | **0.0423** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |        **ImplicitValid** |   **1,269.8 ns** |     **95.51 ns** |     **49.95 ns** | **0.0373** |     **-** |     **-** |   **1,440 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |     **InheritedInvalid** |   **1,452.2 ns** |     **35.67 ns** |     **18.66 ns** | **0.0434** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |     **InterfaceMixed64** |  **97,045.4 ns** | **10,492.24 ns** |  **5,487.64 ns** | **2.8846** |     **-** |     **-** | **110,750 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |      **InterfaceMixed8** |  **10,667.6 ns** |    **355.60 ns** |    **185.98 ns** | **0.3141** |     **-** |     **-** |  **14,353 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |  **NamesakeCaseInvalid** |   **8,605.3 ns** |    **151.78 ns** |     **79.39 ns** | **0.1705** |     **-** |     **-** |   **7,514 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** | **Names(...)valid [23]** |   **8,794.3 ns** |    **259.61 ns** |    **135.78 ns** | **0.1748** |     **-** |     **-** |   **7,314 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |      **OverrideInvalid** |   **1,595.9 ns** |     **42.19 ns** |     **22.07 ns** | **0.0464** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |     **PlainCheckedCase** |     **727.6 ns** |     **49.24 ns** |     **25.75 ns** | **0.0351** |     **-** |     **-** |   **1,392 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |          **PlainObject** |     **138.0 ns** |      **4.54 ns** |      **2.37 ns** | **0.0058** |     **-** |     **-** |     **256 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |      **SuppressedUnion** |   **7,160.8 ns** |    **147.26 ns** |     **77.02 ns** | **0.1427** |     **-** |     **-** |   **6,097 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |      **SuppressedValue** |     **673.3 ns** |     **27.39 ns** |     **14.33 ns** | **0.0198** |     **-** |     **-** |     **864 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** | **TopLevelValueInvalid** |     **989.4 ns** |     **37.38 ns** |     **19.55 ns** | **0.0295** |     **-** |     **-** |   **1,320 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |               **Wide32** |   **7,199.8 ns** |    **187.36 ns** |     **97.99 ns** | **0.1459** |     **-** |     **-** |   **6,792 B** |
|     **UnionBenchmark** |      **Validate** | **Job-WVLOHX** |           **16** |                **Wide8** |   **2,831.8 ns** |     **87.52 ns** |     **45.77 ns** | **0.0571** |     **-** |     **-** |   **3,144 B** |
