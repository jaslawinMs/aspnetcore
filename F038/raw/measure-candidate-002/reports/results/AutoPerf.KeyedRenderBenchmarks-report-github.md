``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F038-SourceComparison  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
| Method | Count |    Keys |          Workload |        Mean |       Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------- |------ |-------- |------------------ |------------:|------------:|----------:|-------:|------:|------:|----------:|
| **Render** |     **0** | **Integer** |       **KeyedStable** |    **165.3 ns** |    **12.50 ns** |   **6.54 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |      **KeyedReorder** |    **163.6 ns** |     **2.12 ns** |   **1.11 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |      **KeyedReplace** |    **163.8 ns** |     **2.08 ns** |   **1.09 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** | **MixedKeyedUnkeyed** |    **169.2 ns** |     **9.13 ns** |   **4.77 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |     **UnkeyedStable** |    **163.2 ns** |     **2.35 ns** |   **1.23 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |       **KeyedStable** |    **160.4 ns** |     **1.96 ns** |   **1.03 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |      **KeyedReorder** |    **158.7 ns** |     **1.12 ns** |   **0.59 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |      **KeyedReplace** |    **159.8 ns** |     **3.30 ns** |   **1.73 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** | **MixedKeyedUnkeyed** |    **166.8 ns** |     **5.60 ns** |   **2.93 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |     **UnkeyedStable** |    **160.6 ns** |     **3.22 ns** |   **1.69 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |       **KeyedStable** |    **348.6 ns** |     **2.99 ns** |   **1.56 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |      **KeyedReorder** |    **357.4 ns** |    **15.73 ns** |   **8.23 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |      **KeyedReplace** |    **611.0 ns** |    **27.21 ns** |  **14.23 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** | **MixedKeyedUnkeyed** |    **352.1 ns** |     **3.49 ns** |   **1.82 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |     **UnkeyedStable** |    **282.0 ns** |     **2.30 ns** |   **1.20 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |       **KeyedStable** |    **382.1 ns** |     **3.90 ns** |   **2.04 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |      **KeyedReorder** |    **384.5 ns** |     **7.56 ns** |   **3.95 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |      **KeyedReplace** |    **472.7 ns** |     **7.94 ns** |   **4.15 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** | **MixedKeyedUnkeyed** |    **378.4 ns** |     **5.12 ns** |   **2.68 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |     **UnkeyedStable** |    **290.1 ns** |     **3.55 ns** |   **1.85 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |       **KeyedStable** |  **2,301.4 ns** |    **16.60 ns** |   **8.68 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |      **KeyedReorder** |  **3,338.9 ns** |    **48.50 ns** |  **25.36 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |      **KeyedReplace** |  **3,932.7 ns** | **1,424.49 ns** | **745.03 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** | **MixedKeyedUnkeyed** |  **2,942.4 ns** |    **32.49 ns** |  **16.99 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |     **UnkeyedStable** |  **1,649.8 ns** |    **14.73 ns** |   **7.70 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |       **KeyedStable** |  **2,789.8 ns** |    **25.87 ns** |  **13.53 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |      **KeyedReorder** |  **4,474.4 ns** |    **25.98 ns** |  **13.59 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |      **KeyedReplace** |  **3,906.5 ns** |    **33.00 ns** |  **17.26 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** | **MixedKeyedUnkeyed** |  **3,456.0 ns** |    **26.99 ns** |  **14.12 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |     **UnkeyedStable** |  **1,659.4 ns** |     **6.87 ns** |   **3.59 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |   **256** | **Integer** |       **KeyedStable** | **31,984.6 ns** |   **301.14 ns** | **157.50 ns** |      **-** |     **-** |     **-** |      **74 B** |
| **Render** |   **256** | **Integer** |      **KeyedReorder** | **49,156.7 ns** |   **675.84 ns** | **353.48 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** |      **KeyedReplace** | **46,178.3 ns** |   **400.15 ns** | **209.28 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** | **MixedKeyedUnkeyed** | **42,770.8 ns** |   **462.13 ns** | **241.70 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** |     **UnkeyedStable** | **22,772.0 ns** |   **247.17 ns** | **129.27 ns** |      **-** |     **-** |     **-** |      **73 B** |
| **Render** |   **256** |  **String** |       **KeyedStable** | **41,121.5 ns** |   **506.01 ns** | **264.65 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** |  **String** |      **KeyedReorder** | **69,272.9 ns** |   **669.87 ns** | **350.35 ns** |      **-** |     **-** |     **-** |      **76 B** |
| **Render** |   **256** |  **String** |      **KeyedReplace** | **63,931.5 ns** |   **615.91 ns** | **322.13 ns** |      **-** |     **-** |     **-** |      **76 B** |
| **Render** |   **256** |  **String** | **MixedKeyedUnkeyed** | **53,748.2 ns** |   **467.01 ns** | **244.25 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** |  **String** |     **UnkeyedStable** | **22,715.0 ns** |   **159.95 ns** |  **83.66 ns** |      **-** |     **-** |     **-** |      **73 B** |
