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
| **Render** |     **0** | **Integer** |       **KeyedStable** |    **164.6 ns** |     **3.34 ns** |   **1.75 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |      **KeyedReorder** |    **161.2 ns** |     **3.96 ns** |   **2.07 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |      **KeyedReplace** |    **163.9 ns** |     **6.13 ns** |   **3.20 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** | **MixedKeyedUnkeyed** |    **160.2 ns** |     **1.71 ns** |   **0.89 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** | **Integer** |     **UnkeyedStable** |    **160.4 ns** |     **0.99 ns** |   **0.52 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |       **KeyedStable** |    **159.5 ns** |     **1.26 ns** |   **0.66 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |      **KeyedReorder** |    **160.9 ns** |     **2.24 ns** |   **1.17 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |      **KeyedReplace** |    **161.0 ns** |     **3.33 ns** |   **1.74 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** | **MixedKeyedUnkeyed** |    **160.6 ns** |     **2.42 ns** |   **1.26 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **0** |  **String** |     **UnkeyedStable** |    **159.9 ns** |     **1.67 ns** |   **0.87 ns** | **0.0016** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |       **KeyedStable** |    **363.1 ns** |     **3.80 ns** |   **1.99 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |      **KeyedReorder** |    **361.2 ns** |     **2.67 ns** |   **1.40 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |      **KeyedReplace** |    **592.5 ns** |     **6.71 ns** |   **3.51 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** | **MixedKeyedUnkeyed** |    **361.8 ns** |     **4.32 ns** |   **2.26 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** | **Integer** |     **UnkeyedStable** |    **300.4 ns** |     **4.96 ns** |   **2.59 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |       **KeyedStable** |    **399.2 ns** |     **5.21 ns** |   **2.72 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |      **KeyedReorder** |    **399.0 ns** |     **5.42 ns** |   **2.84 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |      **KeyedReplace** |    **490.7 ns** |     **6.48 ns** |   **3.39 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** | **MixedKeyedUnkeyed** |    **392.1 ns** |     **4.80 ns** |   **2.51 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |     **1** |  **String** |     **UnkeyedStable** |    **284.4 ns** |     **4.32 ns** |   **2.26 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |       **KeyedStable** |  **2,485.8 ns** |    **23.33 ns** |  **12.20 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |      **KeyedReorder** |  **3,419.7 ns** |    **98.43 ns** |  **51.48 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |      **KeyedReplace** |  **3,157.5 ns** |    **20.74 ns** |  **10.85 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** | **MixedKeyedUnkeyed** |  **3,006.3 ns** |    **22.21 ns** |  **11.62 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** | **Integer** |     **UnkeyedStable** |  **1,635.5 ns** |    **19.21 ns** |  **10.05 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |       **KeyedStable** |  **3,093.4 ns** |    **34.81 ns** |  **18.21 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |      **KeyedReorder** |  **4,825.1 ns** |    **50.86 ns** |  **26.60 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |      **KeyedReplace** |  **4,249.3 ns** |    **60.78 ns** |  **31.79 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** | **MixedKeyedUnkeyed** |  **3,585.2 ns** |    **36.92 ns** |  **19.31 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |    **16** |  **String** |     **UnkeyedStable** |  **1,647.1 ns** |    **18.40 ns** |   **9.62 ns** |      **-** |     **-** |     **-** |      **72 B** |
| **Render** |   **256** | **Integer** |       **KeyedStable** | **35,213.2 ns** |   **261.36 ns** | **136.69 ns** |      **-** |     **-** |     **-** |      **74 B** |
| **Render** |   **256** | **Integer** |      **KeyedReorder** | **51,251.8 ns** | **1,868.02 ns** | **977.01 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** |      **KeyedReplace** | **46,907.6 ns** | **1,753.28 ns** | **917.00 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** | **MixedKeyedUnkeyed** | **44,400.9 ns** | **1,577.78 ns** | **825.21 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** | **Integer** |     **UnkeyedStable** | **22,714.1 ns** |   **367.03 ns** | **191.96 ns** |      **-** |     **-** |     **-** |      **73 B** |
| **Render** |   **256** |  **String** |       **KeyedStable** | **46,449.1 ns** |   **361.29 ns** | **188.96 ns** |      **-** |     **-** |     **-** |      **75 B** |
| **Render** |   **256** |  **String** |      **KeyedReorder** | **73,693.7 ns** |   **788.35 ns** | **412.32 ns** |      **-** |     **-** |     **-** |      **77 B** |
| **Render** |   **256** |  **String** |      **KeyedReplace** | **69,691.9 ns** |   **506.83 ns** | **265.08 ns** |      **-** |     **-** |     **-** |      **76 B** |
| **Render** |   **256** |  **String** | **MixedKeyedUnkeyed** | **56,457.6 ns** | **1,420.41 ns** | **742.90 ns** |      **-** |     **-** |     **-** |      **76 B** |
| **Render** |   **256** |  **String** |     **UnkeyedStable** | **22,729.8 ns** |   **424.92 ns** | **222.24 ns** |      **-** |     **-** |     **-** |      **73 B** |
