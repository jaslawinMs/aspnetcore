``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|               Method |   Operation |       Policy |       Workload |        Mean |       Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------- |------------ |------------- |--------------- |------------:|------------:|----------:|-------:|------:|------:|----------:|
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **WindowInline** |  **1,787.9 ns** | **1,260.23 ns** | **659.13 ns** |      **-** |     **-** |     **-** |     **856 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **WindowDeferred** |  **1,097.9 ns** |    **12.80 ns** |   **6.69 ns** | **0.0217** |     **-** |     **-** |   **1,192 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **ObjectInline** |    **885.1 ns** |    **76.17 ns** |  **39.84 ns** | **0.0178** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **ObjectDeferred** |  **1,107.9 ns** |    **20.23 ns** |  **10.58 ns** | **0.0218** |     **-** |     **-** |   **1,192 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |       **Overlap8** |  **8,911.5 ns** |   **106.70 ns** |  **55.81 ns** | **0.2615** |     **-** |     **-** |   **9,880 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **WindowInline** |    **648.0 ns** |    **14.24 ns** |   **7.45 ns** | **0.0063** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **WindowDeferred** |    **890.7 ns** |    **16.33 ns** |   **8.54 ns** | **0.0175** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **ObjectInline** |    **660.2 ns** |    **22.81 ns** |  **11.93 ns** | **0.0065** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **ObjectDeferred** |    **891.4 ns** |    **10.80 ns** |   **5.65 ns** | **0.0176** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |       **Overlap8** |  **6,998.7 ns** |    **65.79 ns** |  **34.41 ns** | **0.1387** |     **-** |     **-** |   **6,680 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **WindowInline** |    **930.2 ns** |    **14.45 ns** |   **7.56 ns** | **0.0183** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **WindowDeferred** |  **1,296.8 ns** |    **22.53 ns** |  **11.79 ns** | **0.0259** |     **-** |     **-** |   **1,312 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **ObjectInline** |    **937.1 ns** |    **11.53 ns** |   **6.03 ns** | **0.0201** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **ObjectDeferred** |  **1,308.0 ns** |    **19.33 ns** |  **10.11 ns** | **0.0257** |     **-** |     **-** |   **1,312 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |       **Overlap8** | **10,231.1 ns** |   **169.20 ns** |  **88.50 ns** | **0.2029** |     **-** |     **-** |  **10,841 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **WindowInline** |    **705.4 ns** |    **10.44 ns** |   **5.46 ns** | **0.0071** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **WindowDeferred** |  **1,085.5 ns** |    **14.96 ns** |   **7.82 ns** | **0.0215** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **ObjectInline** |    **696.1 ns** |     **5.01 ns** |   **2.62 ns** | **0.0069** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **ObjectDeferred** |  **1,085.6 ns** |    **19.26 ns** |  **10.07 ns** | **0.0214** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |       **Overlap8** |  **8,357.3 ns** |   **211.46 ns** | **110.60 ns** | **0.1682** |     **-** |     **-** |   **7,640 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **WindowInline** |  **1,002.9 ns** |    **16.39 ns** |   **8.57 ns** | **0.0200** |     **-** |     **-** |     **928 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **WindowDeferred** |  **1,290.9 ns** |    **11.86 ns** |   **6.20 ns** | **0.0252** |     **-** |     **-** |   **1,264 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **ObjectInline** |  **1,006.0 ns** |    **36.69 ns** |  **19.19 ns** | **0.0197** |     **-** |     **-** |     **928 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **ObjectDeferred** |  **1,278.8 ns** |    **22.11 ns** |  **11.57 ns** | **0.0254** |     **-** |     **-** |   **1,264 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |       **Overlap8** | **10,174.3 ns** |   **289.05 ns** | **151.18 ns** | **0.2000** |     **-** |     **-** |  **10,457 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **WindowInline** |    **786.3 ns** |    **10.24 ns** |   **5.35 ns** | **0.0078** |     **-** |     **-** |     **528 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **WindowDeferred** |  **1,068.8 ns** |    **22.86 ns** |  **11.96 ns** | **0.0211** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **ObjectInline** |    **788.0 ns** |    **17.39 ns** |   **9.09 ns** | **0.0078** |     **-** |     **-** |     **528 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **ObjectDeferred** |  **1,071.1 ns** |    **88.04 ns** |  **46.05 ns** | **0.0208** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |       **Overlap8** |  **8,333.2 ns** |    **70.61 ns** |  **36.93 ns** | **0.1653** |     **-** |     **-** |   **7,256 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **WindowInline** |    **688.6 ns** |     **4.86 ns** |   **2.54 ns** | **0.0200** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **WindowDeferred** |    **934.7 ns** |    **15.82 ns** |   **8.27 ns** | **0.0276** |     **-** |     **-** |   **1,120 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **ObjectInline** |    **678.8 ns** |     **8.58 ns** |   **4.49 ns** | **0.0201** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **ObjectDeferred** |    **939.2 ns** |    **16.23 ns** |   **8.49 ns** | **0.0274** |     **-** |     **-** |   **1,120 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |       **Overlap8** |  **7,392.3 ns** |    **95.65 ns** |  **50.03 ns** | **0.2173** |     **-** |     **-** |   **9,304 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **WindowInline** |    **460.5 ns** |    **32.40 ns** |  **16.95 ns** | **0.0091** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **WindowDeferred** |    **691.4 ns** |     **9.18 ns** |   **4.80 ns** | **0.0137** |     **-** |     **-** |     **720 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **ObjectInline** |    **461.1 ns** |    **13.51 ns** |   **7.06 ns** | **0.0091** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **ObjectDeferred** |    **706.0 ns** |    **16.29 ns** |   **8.52 ns** | **0.0137** |     **-** |     **-** |     **720 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |       **Overlap8** |  **5,781.1 ns** |    **47.96 ns** |  **25.08 ns** | **0.1653** |     **-** |     **-** |   **6,104 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **WindowInline** |    **862.6 ns** |    **23.01 ns** |  **12.03 ns** | **0.0171** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **WindowDeferred** |  **1,292.9 ns** |    **27.39 ns** |  **14.32 ns** | **0.0255** |     **-** |     **-** |   **1,336 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **ObjectInline** |    **902.6 ns** |    **11.51 ns** |   **6.02 ns** | **0.0178** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **ObjectDeferred** |  **1,311.2 ns** |    **97.44 ns** |  **50.96 ns** | **0.0274** |     **-** |     **-** |   **1,336 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |       **Overlap8** | **10,000.6 ns** |   **147.82 ns** |  **77.32 ns** | **0.2939** |     **-** |     **-** |  **11,033 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **WindowInline** |    **632.2 ns** |    **11.09 ns** |   **5.80 ns** | **0.0063** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **WindowDeferred** |  **1,046.7 ns** |    **17.76 ns** |   **9.29 ns** | **0.0208** |     **-** |     **-** |     **936 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **ObjectInline** |    **676.6 ns** |     **8.20 ns** |   **4.29 ns** | **0.0067** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **ObjectDeferred** |  **1,076.9 ns** |    **19.50 ns** |  **10.20 ns** | **0.0214** |     **-** |     **-** |     **936 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |       **Overlap8** |  **8,133.9 ns** |   **149.54 ns** |  **78.21 ns** | **0.1611** |     **-** |     **-** |   **7,832 B** |
