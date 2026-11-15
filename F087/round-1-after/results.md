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
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |       **CustomStrategy** |     **176.0 ns** |      **7.91 ns** |      **4.14 ns** | **0.0069** |     **-** |     **-** |     **280 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** | **Decor(...)valid [24]** |   **1,420.3 ns** |     **63.06 ns** |     **32.98 ns** | **0.0423** |     **-** |     **-** |   **1,928 B** |
|     UnionBenchmark |      Validate | Job-HAPCGU |           16 | Decor(...)valid [24] |   9,357.1 ns |  2,060.77 ns |  1,077.82 ns | 0.1460 |     - |     - |   7,514 B |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |              **Depth16** |  **12,650.7 ns** |    **680.08 ns** |    **355.70 ns** | **0.2399** |     **-** |     **-** |  **11,601 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |               **Depth4** |   **3,646.3 ns** |    **223.56 ns** |    **116.92 ns** | **0.0718** |     **-** |     **-** |   **3,632 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |         **Depth64Valid** |  **48,449.0 ns** |  **1,274.59 ns** |    **666.63 ns** | **1.4313** |     **-** |     **-** |  **53,267 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |      **ExplicitInvalid** |   **8,179.2 ns** |    **121.61 ns** |     **63.61 ns** | **0.1619** |     **-** |     **-** |   **7,058 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |        **ExplicitValid** |   **7,873.5 ns** |    **126.80 ns** |     **66.32 ns** | **0.1553** |     **-** |     **-** |   **6,570 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |        **FilterEnabled** |   **1,600.6 ns** |    **188.58 ns** |     **98.63 ns** | **0.0456** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |     **FilterSuppressed** |     **687.8 ns** |     **14.84 ns** |      **7.76 ns** | **0.0207** |     **-** |     **-** |     **864 B** |
| **UnionColdBenchmark** | **ValidateBatch** | **Job-ZDADTH** |            **1** |      **FreshDeclared64** |  **87,589.5 ns** | **22,721.77 ns** | **11,883.93 ns** |      **-** |     **-** |     **-** |  **11,960 B** |
| **UnionColdBenchmark** | **ValidateBatch** | **Job-ZDADTH** |            **1** |       **FreshDerived64** |  **41,467.8 ns** |  **9,738.14 ns** |  **5,093.24 ns** |      **-** |     **-** |     **-** |  **16,974 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** | **Impli(...)valid [22]** | **121,151.1 ns** |  **8,085.91 ns** |  **4,229.09 ns** | **2.1930** |     **-** |     **-** | **110,751 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** | **ImplicitArray64Valid** |  **74,738.7 ns** |  **2,743.43 ns** |  **1,434.87 ns** | **1.5432** |     **-** |     **-** |  **78,221 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** | **Impli(...)valid [21]** |  **13,066.8 ns** |    **215.02 ns** |    **112.46 ns** | **0.2604** |     **-** |     **-** |  **14,353 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |  **ImplicitArray8Valid** |  **10,291.3 ns** |  **1,037.04 ns** |    **542.39 ns** | **0.2097** |     **-** |     **-** |  **10,121 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |          **ImplicitInt** |     **791.2 ns** |      **8.83 ns** |      **4.62 ns** | **0.0158** |     **-** |     **-** |     **640 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |      **ImplicitInvalid** |   **1,594.6 ns** |    **137.40 ns** |     **71.86 ns** | **0.0435** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |        **ImplicitValid** |   **1,259.4 ns** |     **66.57 ns** |     **34.82 ns** | **0.0372** |     **-** |     **-** |   **1,440 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |     **InheritedInvalid** |   **1,516.9 ns** |     **86.42 ns** |     **45.20 ns** | **0.0444** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |     **InterfaceMixed64** |  **93,718.4 ns** |  **3,187.00 ns** |  **1,666.86 ns** | **2.1552** |     **-** |     **-** | **110,751 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |      **InterfaceMixed8** |  **10,905.8 ns** |    **381.49 ns** |    **199.53 ns** | **0.3250** |     **-** |     **-** |  **14,353 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |  **NamesakeCaseInvalid** |   **8,904.1 ns** |    **293.17 ns** |    **153.33 ns** | **0.1763** |     **-** |     **-** |   **7,514 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** | **Names(...)valid [23]** |   **8,930.4 ns** |    **106.92 ns** |     **55.92 ns** | **0.1776** |     **-** |     **-** |   **7,314 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |      **OverrideInvalid** |   **2,074.0 ns** |    **572.73 ns** |    **299.55 ns** | **0.0465** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |     **PlainCheckedCase** |     **711.3 ns** |     **17.15 ns** |      **8.97 ns** | **0.0350** |     **-** |     **-** |   **1,392 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |          **PlainObject** |     **143.7 ns** |     **18.67 ns** |      **9.77 ns** | **0.0056** |     **-** |     **-** |     **256 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |      **SuppressedUnion** |   **7,230.5 ns** |     **87.79 ns** |     **45.92 ns** | **0.1432** |     **-** |     **-** |   **6,097 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |      **SuppressedValue** |     **668.7 ns** |     **20.19 ns** |     **10.56 ns** | **0.0198** |     **-** |     **-** |     **864 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** | **TopLevelValueInvalid** |     **977.7 ns** |     **88.40 ns** |     **46.23 ns** | **0.0288** |     **-** |     **-** |   **1,320 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |               **Wide32** |   **7,142.5 ns** |    **179.92 ns** |     **94.10 ns** | **0.1422** |     **-** |     **-** |   **6,792 B** |
|     **UnionBenchmark** |      **Validate** | **Job-HAPCGU** |           **16** |                **Wide8** |   **2,861.7 ns** |    **225.82 ns** |    **118.11 ns** | **0.0837** |     **-** |     **-** |   **3,144 B** |
