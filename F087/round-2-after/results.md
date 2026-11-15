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
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |       **CustomStrategy** |     **180.3 ns** |     **15.98 ns** |      **8.36 ns** | **0.0056** |     **-** |     **-** |     **280 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** | **Decor(...)valid [24]** |   **1,443.9 ns** |     **50.42 ns** |     **26.37 ns** | **0.0430** |     **-** |     **-** |   **1,928 B** |
|     UnionBenchmark |      Validate | Job-QIPMSP |           16 | Decor(...)valid [24] |  12,024.6 ns |  5,184.75 ns |  2,711.72 ns | 0.1386 |     - |     - |   7,514 B |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |              **Depth16** |  **12,192.2 ns** |    **200.10 ns** |    **104.66 ns** | **0.2427** |     **-** |     **-** |  **11,601 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |               **Depth4** |   **3,650.6 ns** |     **82.07 ns** |     **42.92 ns** | **0.0721** |     **-** |     **-** |   **3,632 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |         **Depth64Valid** |  **48,470.5 ns** |  **1,446.02 ns** |    **756.30 ns** | **1.4313** |     **-** |     **-** |  **53,267 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |      **ExplicitInvalid** |   **8,191.4 ns** |    **675.14 ns** |    **353.11 ns** | **0.1628** |     **-** |     **-** |   **7,058 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |        **ExplicitValid** |   **8,194.7 ns** |  **1,063.96 ns** |    **556.47 ns** | **0.1578** |     **-** |     **-** |   **6,570 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |        **FilterEnabled** |   **1,493.8 ns** |     **48.46 ns** |     **25.34 ns** | **0.0455** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |     **FilterSuppressed** |     **704.3 ns** |     **66.09 ns** |     **34.57 ns** | **0.0206** |     **-** |     **-** |     **864 B** |
| **UnionColdBenchmark** | **ValidateBatch** | **Job-RHFHCP** |            **1** |      **FreshDeclared64** |  **92,322.3 ns** | **26,212.53 ns** | **13,709.66 ns** |      **-** |     **-** |     **-** |  **11,198 B** |
| **UnionColdBenchmark** | **ValidateBatch** | **Job-RHFHCP** |            **1** |       **FreshDerived64** |  **36,843.4 ns** |  **3,874.35 ns** |  **2,026.36 ns** |      **-** |     **-** |     **-** |  **17,262 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** | **Impli(...)valid [22]** | **116,983.3 ns** | **10,975.91 ns** |  **5,740.61 ns** | **2.2321** |     **-** |     **-** | **110,751 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** | **ImplicitArray64Valid** |  **76,660.4 ns** |  **4,044.92 ns** |  **2,115.57 ns** | **1.5823** |     **-** |     **-** |  **78,221 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** | **Impli(...)valid [21]** |  **13,278.8 ns** |    **354.91 ns** |    **185.63 ns** | **0.2610** |     **-** |     **-** |  **14,353 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |  **ImplicitArray8Valid** |   **9,752.8 ns** |    **228.76 ns** |    **119.64 ns** | **0.1935** |     **-** |     **-** |  **10,121 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |          **ImplicitInt** |     **802.1 ns** |     **26.69 ns** |     **13.96 ns** | **0.0158** |     **-** |     **-** |     **640 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |      **ImplicitInvalid** |   **1,614.7 ns** |    **139.07 ns** |     **72.74 ns** | **0.0483** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |        **ImplicitValid** |   **1,284.3 ns** |     **71.28 ns** |     **37.28 ns** | **0.0375** |     **-** |     **-** |   **1,440 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |     **InheritedInvalid** |   **1,518.1 ns** |    **163.62 ns** |     **85.58 ns** | **0.0455** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |     **InterfaceMixed64** | **102,710.2 ns** |  **6,859.35 ns** |  **3,587.57 ns** | **1.9841** |     **-** |     **-** | **110,750 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |      **InterfaceMixed8** |  **12,024.0 ns** |    **628.82 ns** |    **328.88 ns** | **0.3669** |     **-** |     **-** |  **14,353 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |  **NamesakeCaseInvalid** |   **8,745.1 ns** |    **189.17 ns** |     **98.94 ns** | **0.1812** |     **-** |     **-** |   **7,514 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** | **Names(...)valid [23]** |   **8,946.1 ns** |    **702.41 ns** |    **367.37 ns** | **0.1776** |     **-** |     **-** |   **7,314 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |      **OverrideInvalid** |   **1,698.5 ns** |    **202.79 ns** |    **106.06 ns** | **0.0479** |     **-** |     **-** |   **1,928 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |     **PlainCheckedCase** |     **749.1 ns** |    **114.84 ns** |     **60.06 ns** | **0.0350** |     **-** |     **-** |   **1,392 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |          **PlainObject** |     **136.0 ns** |      **6.82 ns** |      **3.57 ns** | **0.0068** |     **-** |     **-** |     **256 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |      **SuppressedUnion** |   **7,333.0 ns** |    **790.47 ns** |    **413.43 ns** | **0.1478** |     **-** |     **-** |   **6,097 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |      **SuppressedValue** |     **699.2 ns** |     **70.13 ns** |     **36.68 ns** | **0.0231** |     **-** |     **-** |     **864 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** | **TopLevelValueInvalid** |   **1,002.6 ns** |     **70.31 ns** |     **36.77 ns** | **0.0331** |     **-** |     **-** |   **1,320 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |               **Wide32** |   **7,127.0 ns** |    **124.23 ns** |     **64.97 ns** | **0.1416** |     **-** |     **-** |   **6,792 B** |
|     **UnionBenchmark** |      **Validate** | **Job-QIPMSP** |           **16** |                **Wide8** |   **3,034.5 ns** |    **474.78 ns** |    **248.32 ns** | **0.0578** |     **-** |     **-** |   **3,144 B** |
