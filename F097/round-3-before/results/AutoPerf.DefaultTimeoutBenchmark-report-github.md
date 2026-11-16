``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|               Method |   Operation |       Policy |       Workload |        Mean |       Error |    StdDev |      Median |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------- |------------ |------------- |--------------- |------------:|------------:|----------:|------------:|-------:|------:|------:|----------:|
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **WindowInline** |  **1,443.8 ns** | **1,300.79 ns** | **680.34 ns** |  **1,146.0 ns** |      **-** |     **-** |     **-** |     **856 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **WindowDeferred** |  **1,104.4 ns** |    **14.65 ns** |   **7.66 ns** |  **1,106.6 ns** | **0.0215** |     **-** |     **-** |   **1,192 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **ObjectInline** |    **859.6 ns** |    **18.37 ns** |   **9.61 ns** |    **857.1 ns** | **0.0173** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **ObjectDeferred** |  **1,098.7 ns** |    **13.65 ns** |   **7.14 ns** |  **1,099.5 ns** | **0.0218** |     **-** |     **-** |   **1,192 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |       **Overlap8** |  **9,081.7 ns** |   **218.96 ns** | **114.52 ns** |  **9,088.7 ns** | **0.2645** |     **-** |     **-** |   **9,880 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **WindowInline** |    **638.7 ns** |    **16.04 ns** |   **8.39 ns** |    **638.5 ns** | **0.0124** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **WindowDeferred** |    **888.4 ns** |    **15.15 ns** |   **7.92 ns** |    **888.0 ns** | **0.0173** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **ObjectInline** |    **637.5 ns** |    **13.63 ns** |   **7.13 ns** |    **636.5 ns** | **0.0063** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **ObjectDeferred** |    **894.6 ns** |    **12.82 ns** |   **6.70 ns** |    **891.0 ns** | **0.0177** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |       **Overlap8** |  **7,013.4 ns** |   **159.94 ns** |  **83.65 ns** |  **7,008.1 ns** | **0.1377** |     **-** |     **-** |   **6,680 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **WindowInline** |    **936.7 ns** |    **25.99 ns** |  **13.59 ns** |    **931.4 ns** | **0.0183** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **WindowDeferred** |  **1,291.5 ns** |    **18.46 ns** |   **9.66 ns** |  **1,291.3 ns** | **0.0253** |     **-** |     **-** |   **1,312 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **ObjectInline** |    **921.7 ns** |    **36.08 ns** |  **18.87 ns** |    **916.8 ns** | **0.0183** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **ObjectDeferred** |  **1,289.9 ns** |    **17.83 ns** |   **9.33 ns** |  **1,291.7 ns** | **0.0257** |     **-** |     **-** |   **1,312 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |       **Overlap8** | **10,268.6 ns** |   **160.24 ns** |  **83.81 ns** | **10,275.4 ns** | **0.2046** |     **-** |     **-** |  **10,841 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **WindowInline** |    **687.9 ns** |    **10.57 ns** |   **5.53 ns** |    **688.0 ns** | **0.0068** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **WindowDeferred** |  **1,069.6 ns** |    **14.21 ns** |   **7.43 ns** |  **1,069.4 ns** | **0.0211** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **ObjectInline** |    **681.5 ns** |     **6.27 ns** |   **3.28 ns** |    **682.4 ns** | **0.0067** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **ObjectDeferred** |  **1,090.1 ns** |    **12.50 ns** |   **6.54 ns** |  **1,090.2 ns** | **0.0210** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |       **Overlap8** |  **8,444.2 ns** |   **192.74 ns** | **100.81 ns** |  **8,437.7 ns** | **0.1676** |     **-** |     **-** |   **7,640 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **WindowInline** |    **996.1 ns** |    **20.53 ns** |  **10.74 ns** |    **994.0 ns** | **0.0196** |     **-** |     **-** |     **928 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **WindowDeferred** |  **1,268.0 ns** |    **15.76 ns** |   **8.24 ns** |  **1,265.1 ns** | **0.0250** |     **-** |     **-** |   **1,264 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **ObjectInline** |    **998.1 ns** |     **6.52 ns** |   **3.41 ns** |    **996.6 ns** | **0.0199** |     **-** |     **-** |     **928 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **ObjectDeferred** |  **1,274.7 ns** |    **30.03 ns** |  **15.71 ns** |  **1,274.3 ns** | **0.0251** |     **-** |     **-** |   **1,264 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |       **Overlap8** | **10,171.3 ns** |   **138.72 ns** |  **72.55 ns** | **10,169.0 ns** | **0.2003** |     **-** |     **-** |  **10,457 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **WindowInline** |    **781.1 ns** |    **15.83 ns** |   **8.28 ns** |    **777.5 ns** | **0.0077** |     **-** |     **-** |     **528 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **WindowDeferred** |  **1,044.8 ns** |    **13.07 ns** |   **6.84 ns** |  **1,042.3 ns** | **0.0207** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **ObjectInline** |    **783.5 ns** |    **15.57 ns** |   **8.14 ns** |    **786.4 ns** | **0.0076** |     **-** |     **-** |     **528 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **ObjectDeferred** |  **1,053.7 ns** |    **14.55 ns** |   **7.61 ns** |  **1,053.3 ns** | **0.0209** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |       **Overlap8** |  **8,376.6 ns** |   **393.33 ns** | **205.72 ns** |  **8,309.6 ns** | **0.1647** |     **-** |     **-** |   **7,256 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **WindowInline** |    **676.8 ns** |    **17.00 ns** |   **8.89 ns** |    **673.7 ns** | **0.0199** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **WindowDeferred** |    **945.3 ns** |    **46.35 ns** |  **24.24 ns** |    **939.1 ns** | **0.0281** |     **-** |     **-** |   **1,120 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **ObjectInline** |    **687.7 ns** |    **44.69 ns** |  **23.37 ns** |    **677.4 ns** | **0.0202** |     **-** |     **-** |     **792 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **ObjectDeferred** |    **938.4 ns** |    **68.15 ns** |  **35.64 ns** |    **924.4 ns** | **0.0269** |     **-** |     **-** |   **1,120 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |       **Overlap8** |  **7,467.0 ns** |   **337.51 ns** | **176.52 ns** |  **7,413.8 ns** | **0.2178** |     **-** |     **-** |   **9,304 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **WindowInline** |    **457.3 ns** |    **15.80 ns** |   **8.27 ns** |    **455.3 ns** | **0.0090** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **WindowDeferred** |    **704.1 ns** |    **58.84 ns** |  **30.77 ns** |    **692.2 ns** | **0.0134** |     **-** |     **-** |     **720 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **ObjectInline** |    **455.8 ns** |    **29.56 ns** |  **15.46 ns** |    **449.5 ns** | **0.0089** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **ObjectDeferred** |    **717.5 ns** |    **22.92 ns** |  **11.99 ns** |    **716.4 ns** | **0.0140** |     **-** |     **-** |     **720 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |       **Overlap8** |  **5,667.6 ns** |   **230.56 ns** | **120.59 ns** |  **5,631.4 ns** | **0.1099** |     **-** |     **-** |   **6,104 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **WindowInline** |    **862.4 ns** |    **27.08 ns** |  **14.16 ns** |    **863.4 ns** | **0.0171** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **WindowDeferred** |  **1,294.5 ns** |    **25.51 ns** |  **13.34 ns** |  **1,297.6 ns** | **0.0252** |     **-** |     **-** |   **1,336 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **ObjectInline** |    **910.8 ns** |    **66.91 ns** |  **35.00 ns** |    **899.1 ns** | **0.0176** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **ObjectDeferred** |  **1,319.4 ns** |    **83.39 ns** |  **43.62 ns** |  **1,308.9 ns** | **0.0271** |     **-** |     **-** |   **1,336 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |       **Overlap8** | **10,117.6 ns** |   **321.34 ns** | **168.07 ns** | **10,117.7 ns** | **0.2957** |     **-** |     **-** |  **11,033 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **WindowInline** |    **650.3 ns** |    **47.53 ns** |  **24.86 ns** |    **641.2 ns** | **0.0064** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **WindowDeferred** |  **1,059.3 ns** |    **30.88 ns** |  **16.15 ns** |  **1,060.4 ns** | **0.0212** |     **-** |     **-** |     **936 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **ObjectInline** |    **654.7 ns** |    **15.95 ns** |   **8.34 ns** |    **653.1 ns** | **0.0065** |     **-** |     **-** |     **464 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **ObjectDeferred** |  **1,069.5 ns** |    **54.47 ns** |  **28.49 ns** |  **1,061.5 ns** | **0.0208** |     **-** |     **-** |     **936 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |       **Overlap8** |  **8,137.3 ns** |   **151.89 ns** |  **79.44 ns** |  **8,132.2 ns** | **0.1607** |     **-** |     **-** |   **7,832 B** |
