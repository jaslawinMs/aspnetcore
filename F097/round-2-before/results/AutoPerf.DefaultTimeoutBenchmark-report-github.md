``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|               Method |   Operation |       Policy |       Workload |        Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------- |------------ |------------- |--------------- |------------:|------------:|------------:|-------:|------:|------:|----------:|
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **WindowInline** |  **2,578.7 ns** | **2,376.21 ns** | **1,242.81 ns** |      **-** |     **-** |     **-** |     **856 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **WindowDeferred** |  **1,100.5 ns** |    **54.42 ns** |    **28.46 ns** | **0.0315** |     **-** |     **-** |   **1,192 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **ObjectInline** |    **840.7 ns** |    **21.58 ns** |    **11.29 ns** | **0.0166** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **ObjectDeferred** |  **1,103.9 ns** |    **48.33 ns** |    **25.28 ns** | **0.0315** |     **-** |     **-** |   **1,192 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |       **Overlap8** |  **8,686.1 ns** |   **136.03 ns** |    **71.15 ns** | **0.2593** |     **-** |     **-** |   **9,880 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **WindowInline** |    **647.9 ns** |    **11.66 ns** |     **6.10 ns** | **0.0123** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **WindowDeferred** |    **874.2 ns** |    **15.10 ns** |     **7.90 ns** | **0.0172** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **ObjectInline** |    **657.4 ns** |    **54.92 ns** |    **28.72 ns** | **0.0063** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **ObjectDeferred** |    **877.8 ns** |    **15.58 ns** |     **8.15 ns** | **0.0172** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |       **Overlap8** |  **6,889.2 ns** |   **339.74 ns** |   **177.69 ns** | **0.1363** |     **-** |     **-** |   **6,680 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **WindowInline** |    **901.3 ns** |    **14.29 ns** |     **7.48 ns** | **0.0178** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **WindowDeferred** |  **1,243.4 ns** |    **16.33 ns** |     **8.54 ns** | **0.0246** |     **-** |     **-** |   **1,312 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **ObjectInline** |    **895.4 ns** |    **22.47 ns** |    **11.75 ns** | **0.0179** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **ObjectDeferred** |  **1,262.2 ns** |    **90.22 ns** |    **47.19 ns** | **0.0248** |     **-** |     **-** |   **1,312 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |       **Overlap8** | **10,052.1 ns** |   **180.51 ns** |    **94.41 ns** | **0.1972** |     **-** |     **-** |  **10,841 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **WindowInline** |    **684.7 ns** |     **9.60 ns** |     **5.02 ns** | **0.0068** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **WindowDeferred** |  **1,065.5 ns** |    **63.87 ns** |    **33.41 ns** | **0.0211** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **ObjectInline** |    **684.6 ns** |    **11.04 ns** |     **5.77 ns** | **0.0068** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **ObjectDeferred** |  **1,056.6 ns** |    **16.65 ns** |     **8.71 ns** | **0.0211** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |       **Overlap8** |  **8,165.2 ns** |   **102.54 ns** |    **53.63 ns** | **0.1643** |     **-** |     **-** |   **7,640 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **WindowInline** |    **985.2 ns** |    **78.40 ns** |    **41.01 ns** | **0.0192** |     **-** |     **-** |     **928 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **WindowDeferred** |  **1,218.7 ns** |    **29.01 ns** |    **15.17 ns** | **0.0247** |     **-** |     **-** |   **1,264 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **ObjectInline** |    **970.2 ns** |    **44.71 ns** |    **23.38 ns** | **0.0194** |     **-** |     **-** |     **928 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **ObjectDeferred** |  **1,237.2 ns** |    **42.94 ns** |    **22.46 ns** | **0.0241** |     **-** |     **-** |   **1,264 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |       **Overlap8** |  **9,924.2 ns** |   **637.36 ns** |   **333.35 ns** | **0.1997** |     **-** |     **-** |  **10,457 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **WindowInline** |    **773.4 ns** |    **22.32 ns** |    **11.68 ns** | **0.0076** |     **-** |     **-** |     **528 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **WindowDeferred** |  **1,045.1 ns** |    **20.89 ns** |    **10.92 ns** | **0.0204** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **ObjectInline** |    **771.0 ns** |    **14.07 ns** |     **7.36 ns** | **0.0076** |     **-** |     **-** |     **528 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **ObjectDeferred** |  **1,045.1 ns** |    **12.55 ns** |     **6.56 ns** | **0.0206** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |       **Overlap8** |  **8,436.7 ns** |   **550.52 ns** |   **287.93 ns** | **0.1621** |     **-** |     **-** |   **7,256 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **WindowInline** |    **647.1 ns** |    **20.37 ns** |    **10.65 ns** | **0.0188** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **WindowDeferred** |    **839.4 ns** |    **19.44 ns** |    **10.17 ns** | **0.0256** |     **-** |     **-** |   **1,120 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **ObjectInline** |    **638.6 ns** |     **9.60 ns** |     **5.02 ns** | **0.0188** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **ObjectDeferred** |    **846.9 ns** |    **21.83 ns** |    **11.42 ns** | **0.0253** |     **-** |     **-** |   **1,120 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |       **Overlap8** |  **6,720.2 ns** |   **180.17 ns** |    **94.23 ns** | **0.2018** |     **-** |     **-** |   **9,304 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **WindowInline** |    **450.4 ns** |     **9.69 ns** |     **5.07 ns** | **0.0089** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **WindowDeferred** |    **652.2 ns** |    **14.27 ns** |     **7.46 ns** | **0.0129** |     **-** |     **-** |     **720 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **ObjectInline** |    **455.0 ns** |     **4.76 ns** |     **2.49 ns** | **0.0088** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **ObjectDeferred** |    **665.2 ns** |    **49.30 ns** |    **25.79 ns** | **0.0132** |     **-** |     **-** |     **720 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |       **Overlap8** |  **5,404.0 ns** |   **427.63 ns** |   **223.66 ns** | **0.1574** |     **-** |     **-** |   **6,104 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **WindowInline** |    **807.7 ns** |    **31.58 ns** |    **16.52 ns** | **0.0163** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **WindowDeferred** |  **1,214.3 ns** |    **44.89 ns** |    **23.48 ns** | **0.0243** |     **-** |     **-** |   **1,336 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **ObjectInline** |    **830.3 ns** |    **11.61 ns** |     **6.07 ns** | **0.0165** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **ObjectDeferred** |  **1,232.0 ns** |    **42.14 ns** |    **22.04 ns** | **0.0244** |     **-** |     **-** |   **1,336 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |       **Overlap8** |  **9,735.3 ns** |   **338.39 ns** |   **176.98 ns** | **0.2811** |     **-** |     **-** |  **11,032 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **WindowInline** |    **638.8 ns** |    **24.89 ns** |    **13.02 ns** | **0.0124** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **WindowDeferred** |  **1,003.9 ns** |    **23.51 ns** |    **12.30 ns** | **0.0198** |     **-** |     **-** |     **936 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **ObjectInline** |    **650.4 ns** |    **11.68 ns** |     **6.11 ns** | **0.0063** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **ObjectDeferred** |  **1,065.0 ns** |    **19.54 ns** |    **10.22 ns** | **0.0205** |     **-** |     **-** |     **936 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |       **Overlap8** |  **8,025.6 ns** |   **206.61 ns** |   **108.06 ns** | **0.1570** |     **-** |     **-** |   **7,832 B** |
