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
| **Render** |     **0** | **Integer** |       **KeyedStable** |    **161.5 ns** |     **7.28 ns** |   **3.81 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |      **KeyedReorder** |    **164.2 ns** |     **9.89 ns** |   **5.17 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |      **KeyedReplace** |    **165.1 ns** |    **10.80 ns** |   **5.65 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** | **MixedKeyedUnkeyed** |    **160.7 ns** |     **2.25 ns** |   **1.17 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |     **UnkeyedStable** |    **159.9 ns** |     **1.97 ns** |   **1.03 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |       **KeyedStable** |    **159.6 ns** |     **2.46 ns** |   **1.29 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |      **KeyedReorder** |    **162.9 ns** |    **12.52 ns** |   **6.55 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |      **KeyedReplace** |    **160.0 ns** |     **2.26 ns** |   **1.18 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** | **MixedKeyedUnkeyed** |    **159.2 ns** |     **2.65 ns** |   **1.39 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |     **UnkeyedStable** |    **160.4 ns** |     **3.89 ns** |   **2.03 ns** | **0.0017** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |       **KeyedStable** |    **355.6 ns** |     **4.05 ns** |   **2.12 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |      **KeyedReorder** |    **360.5 ns** |     **4.37 ns** |   **2.29 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |      **KeyedReplace** |    **597.2 ns** |     **2.97 ns** |   **1.55 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** | **MixedKeyedUnkeyed** |    **357.4 ns** |     **2.33 ns** |   **1.22 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |     **UnkeyedStable** |    **285.5 ns** |    **11.95 ns** |   **6.25 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |       **KeyedStable** |    **392.8 ns** |     **4.14 ns** |   **2.16 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |      **KeyedReorder** |    **391.1 ns** |     **6.38 ns** |   **3.34 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |      **KeyedReplace** |    **486.3 ns** |     **5.76 ns** |   **3.01 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** | **MixedKeyedUnkeyed** |    **398.2 ns** |     **4.64 ns** |   **2.43 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |     **UnkeyedStable** |    **285.0 ns** |     **4.77 ns** |   **2.49 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |       **KeyedStable** |  **2,446.7 ns** |    **30.39 ns** |  **15.89 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |      **KeyedReorder** |  **3,351.6 ns** |    **14.19 ns** |   **7.42 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |      **KeyedReplace** |  **3,085.9 ns** |    **35.34 ns** |  **18.48 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** | **MixedKeyedUnkeyed** |  **2,958.1 ns** |    **25.33 ns** |  **13.25 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |     **UnkeyedStable** |  **1,639.7 ns** |    **14.01 ns** |   **7.33 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |       **KeyedStable** |  **3,047.0 ns** |    **48.16 ns** |  **25.19 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |      **KeyedReorder** |  **4,732.9 ns** |    **48.98 ns** |  **25.62 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |      **KeyedReplace** |  **4,117.8 ns** |    **61.63 ns** |  **32.23 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** | **MixedKeyedUnkeyed** |  **3,499.6 ns** |    **22.71 ns** |  **11.88 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |     **UnkeyedStable** |  **1,634.2 ns** |    **12.96 ns** |   **6.78 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |   **256** | **Integer** |       **KeyedStable** | **34,703.4 ns** |   **690.67 ns** | **361.23 ns** |      **-** |     **-** |     **-** |      **74 B** |
| **Render** |   **256** | **Integer** |      **KeyedReorder** | **48,420.3 ns** |   **339.20 ns** | **177.41 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** |      **KeyedReplace** | **45,409.1 ns** |   **442.89 ns** | **231.64 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** | **MixedKeyedUnkeyed** | **42,454.4 ns** |   **385.70 ns** | **201.73 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** |     **UnkeyedStable** | **22,753.7 ns** |   **195.32 ns** | **102.15 ns** |      **-** |     **-** |     **-** |      **73 B** |
| **Render** |   **256** |  **String** |       **KeyedStable** | **46,711.5 ns** |   **586.02 ns** | **306.50 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** |  **String** |      **KeyedReorder** | **72,758.3 ns** | **1,479.13 ns** | **773.61 ns** |      **-** |     **-** |     **-** |      **77 B** |
| **Render** |   **256** |  **String** |      **KeyedReplace** | **67,819.3 ns** |   **603.82 ns** | **315.81 ns** |      **-** |     **-** |     **-** |      **76 B** |
| **Render** |   **256** |  **String** | **MixedKeyedUnkeyed** | **55,611.6 ns** |   **408.64 ns** | **213.73 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** |  **String** |     **UnkeyedStable** | **22,742.8 ns** |   **194.50 ns** | **101.73 ns** |      **-** |     **-** |     **-** |      **73 B** |
