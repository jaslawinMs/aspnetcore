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
| **Render** |     **0** | **Integer** |       **KeyedStable** |    **164.2 ns** |     **6.59 ns** |   **3.45 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |      **KeyedReorder** |    **160.5 ns** |     **3.06 ns** |   **1.60 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |      **KeyedReplace** |    **160.5 ns** |     **6.25 ns** |   **3.27 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** | **MixedKeyedUnkeyed** |    **160.5 ns** |     **3.36 ns** |   **1.76 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |     **UnkeyedStable** |    **160.8 ns** |     **4.17 ns** |   **2.18 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |       **KeyedStable** |    **167.6 ns** |     **3.84 ns** |   **2.01 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |      **KeyedReorder** |    **162.9 ns** |     **4.45 ns** |   **2.33 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |      **KeyedReplace** |    **161.4 ns** |     **2.55 ns** |   **1.33 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** | **MixedKeyedUnkeyed** |    **163.5 ns** |     **4.73 ns** |   **2.48 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |     **UnkeyedStable** |    **164.1 ns** |     **3.43 ns** |   **1.80 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |       **KeyedStable** |    **359.7 ns** |     **3.91 ns** |   **2.04 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |      **KeyedReorder** |    **354.5 ns** |     **6.73 ns** |   **3.52 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |      **KeyedReplace** |    **601.0 ns** |     **9.98 ns** |   **5.22 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** | **MixedKeyedUnkeyed** |    **346.3 ns** |     **2.95 ns** |   **1.54 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |     **UnkeyedStable** |    **285.2 ns** |     **6.99 ns** |   **3.66 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |       **KeyedStable** |    **374.2 ns** |     **3.93 ns** |   **2.06 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |      **KeyedReorder** |    **379.7 ns** |    **19.23 ns** |  **10.06 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |      **KeyedReplace** |    **481.4 ns** |    **17.24 ns** |   **9.02 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** | **MixedKeyedUnkeyed** |    **381.2 ns** |     **9.20 ns** |   **4.81 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |     **UnkeyedStable** |    **283.6 ns** |     **4.76 ns** |   **2.49 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |       **KeyedStable** |  **2,339.1 ns** |    **39.23 ns** |  **20.52 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |      **KeyedReorder** |  **3,355.2 ns** |    **56.79 ns** |  **29.70 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |      **KeyedReplace** |  **3,143.4 ns** |    **64.12 ns** |  **33.54 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** | **MixedKeyedUnkeyed** |  **2,980.0 ns** |    **45.05 ns** |  **23.56 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |     **UnkeyedStable** |  **1,718.8 ns** |    **15.57 ns** |   **8.14 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |       **KeyedStable** |  **2,826.1 ns** |    **51.53 ns** |  **26.95 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |      **KeyedReorder** |  **4,570.9 ns** |    **57.09 ns** |  **29.86 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |      **KeyedReplace** |  **3,896.5 ns** |    **65.95 ns** |  **34.49 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** | **MixedKeyedUnkeyed** |  **3,509.4 ns** |    **35.58 ns** |  **18.61 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |     **UnkeyedStable** |  **1,694.0 ns** |    **13.32 ns** |   **6.96 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |   **256** | **Integer** |       **KeyedStable** | **32,974.2 ns** |   **374.30 ns** | **195.76 ns** |      **-** |     **-** |     **-** |      **74 B** |
| **Render** |   **256** | **Integer** |      **KeyedReorder** | **48,949.8 ns** |   **323.66 ns** | **169.28 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** |      **KeyedReplace** | **46,411.9 ns** |   **687.90 ns** | **359.78 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** | **MixedKeyedUnkeyed** | **43,512.6 ns** |   **793.31 ns** | **414.91 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** |     **UnkeyedStable** | **22,598.2 ns** |   **249.86 ns** | **130.68 ns** |      **-** |     **-** |     **-** |      **73 B** |
| **Render** |   **256** |  **String** |       **KeyedStable** | **41,507.0 ns** |   **544.94 ns** | **285.01 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** |  **String** |      **KeyedReorder** | **69,119.7 ns** |   **638.77 ns** | **334.09 ns** |      **-** |     **-** |     **-** |      **76 B** |
| **Render** |   **256** |  **String** |      **KeyedReplace** | **64,745.8 ns** | **1,258.82 ns** | **658.39 ns** |      **-** |     **-** |     **-** |      **76 B** |
| **Render** |   **256** |  **String** | **MixedKeyedUnkeyed** | **54,885.9 ns** |   **939.12 ns** | **491.18 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** |  **String** |     **UnkeyedStable** | **22,610.6 ns** |   **243.90 ns** | **127.56 ns** |      **-** |     **-** |     **-** |      **73 B** |
