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
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **WindowInline** |  **1,697.2 ns** | **1,695.65 ns** | **886.86 ns** |      **-** |     **-** |     **-** |     **504 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **WindowDeferred** |  **1,072.7 ns** |    **35.11 ns** |  **18.36 ns** | **0.0207** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **ObjectInline** |    **805.2 ns** |    **21.88 ns** |  **11.44 ns** | **0.0080** |     **-** |     **-** |     **512 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **ObjectDeferred** |  **1,072.2 ns** |    **53.37 ns** |  **27.91 ns** | **0.0208** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |       **Overlap8** |  **9,148.7 ns** |   **175.81 ns** |  **91.95 ns** | **0.1771** |     **-** |     **-** |   **9,080 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **WindowInline** |    **637.4 ns** |    **13.41 ns** |   **7.01 ns** | **0.0063** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **WindowDeferred** |    **889.2 ns** |    **17.37 ns** |   **9.09 ns** | **0.0172** |     **-** |     **-** |     **744 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **ObjectInline** |    **647.9 ns** |    **18.99 ns** |   **9.93 ns** | **0.0064** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **ObjectDeferred** |    **886.5 ns** |    **14.02 ns** |   **7.34 ns** | **0.0177** |     **-** |     **-** |     **744 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |       **Overlap8** |  **7,085.5 ns** |   **189.96 ns** |  **99.35 ns** | **0.1390** |     **-** |     **-** |   **6,296 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **WindowInline** |    **858.4 ns** |    **32.89 ns** |  **17.20 ns** | **0.0084** |     **-** |     **-** |     **488 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **WindowDeferred** |  **1,237.7 ns** |    **16.69 ns** |   **8.73 ns** | **0.0244** |     **-** |     **-** |     **960 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **ObjectInline** |    **868.3 ns** |    **23.09 ns** |  **12.07 ns** | **0.0087** |     **-** |     **-** |     **488 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **ObjectDeferred** |  **1,265.3 ns** |    **24.40 ns** |  **12.76 ns** | **0.0245** |     **-** |     **-** |     **960 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |       **Overlap8** | **10,487.6 ns** |   **291.79 ns** | **152.61 ns** | **0.2090** |     **-** |     **-** |  **10,041 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **WindowInline** |    **688.9 ns** |     **9.21 ns** |   **4.81 ns** | **0.0067** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **WindowDeferred** |  **1,062.7 ns** |    **14.84 ns** |   **7.76 ns** | **0.0211** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **ObjectInline** |    **693.2 ns** |    **22.99 ns** |  **12.02 ns** | **0.0067** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **ObjectDeferred** |  **1,079.9 ns** |    **25.42 ns** |  **13.30 ns** | **0.0212** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |       **Overlap8** |  **8,380.1 ns** |   **179.30 ns** |  **93.78 ns** | **0.1625** |     **-** |     **-** |   **7,256 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **WindowInline** |    **937.1 ns** |    **27.82 ns** |  **14.55 ns** | **0.0094** |     **-** |     **-** |     **576 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **WindowDeferred** |  **1,260.6 ns** |   **107.76 ns** |  **56.36 ns** | **0.0241** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **ObjectInline** |    **974.3 ns** |   **127.15 ns** |  **66.50 ns** | **0.0094** |     **-** |     **-** |     **576 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **ObjectDeferred** |  **1,221.0 ns** |    **19.53 ns** |  **10.21 ns** | **0.0246** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |       **Overlap8** | **10,607.1 ns** |   **223.52 ns** | **116.91 ns** | **0.2049** |     **-** |     **-** |   **9,657 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **WindowInline** |    **763.5 ns** |    **13.15 ns** |   **6.88 ns** | **0.0076** |     **-** |     **-** |     **480 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **WindowDeferred** |  **1,063.6 ns** |    **26.33 ns** |  **13.77 ns** | **0.0207** |     **-** |     **-** |     **816 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **ObjectInline** |    **763.1 ns** |    **18.99 ns** |   **9.93 ns** | **0.0077** |     **-** |     **-** |     **480 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **ObjectDeferred** |  **1,059.6 ns** |    **41.92 ns** |  **21.93 ns** | **0.0208** |     **-** |     **-** |     **816 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |       **Overlap8** |  **8,291.6 ns** |   **184.08 ns** |  **96.28 ns** | **0.1613** |     **-** |     **-** |   **6,872 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **WindowInline** |    **616.9 ns** |    **13.66 ns** |   **7.14 ns** | **0.0061** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **WindowDeferred** |    **854.4 ns** |    **38.00 ns** |  **19.87 ns** | **0.0171** |     **-** |     **-** |     **768 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **ObjectInline** |    **623.9 ns** |    **14.73 ns** |   **7.71 ns** | **0.0063** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **ObjectDeferred** |    **864.6 ns** |    **30.82 ns** |  **16.12 ns** | **0.0168** |     **-** |     **-** |     **768 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |       **Overlap8** |  **7,684.9 ns** |   **366.60 ns** | **191.74 ns** | **0.2229** |     **-** |     **-** |   **8,504 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **WindowInline** |    **461.4 ns** |    **15.68 ns** |   **8.20 ns** | **0.0092** |     **-** |     **-** |     **344 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **WindowDeferred** |    **709.9 ns** |    **25.67 ns** |  **13.43 ns** | **0.0137** |     **-** |     **-** |     **672 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **ObjectInline** |    **469.2 ns** |    **12.65 ns** |   **6.62 ns** | **0.0091** |     **-** |     **-** |     **344 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **ObjectDeferred** |    **710.2 ns** |    **22.22 ns** |  **11.62 ns** | **0.0136** |     **-** |     **-** |     **672 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |       **Overlap8** |  **5,562.8 ns** |   **200.19 ns** | **104.70 ns** | **0.1120** |     **-** |     **-** |   **5,720 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **WindowInline** |    **792.8 ns** |    **32.43 ns** |  **16.96 ns** | **0.0078** |     **-** |     **-** |     **512 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **WindowDeferred** |  **1,229.6 ns** |    **28.74 ns** |  **15.03 ns** | **0.0254** |     **-** |     **-** |     **984 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **ObjectInline** |    **815.4 ns** |    **31.93 ns** |  **16.70 ns** | **0.0081** |     **-** |     **-** |     **512 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **ObjectDeferred** |  **1,234.1 ns** |    **33.28 ns** |  **17.41 ns** | **0.0241** |     **-** |     **-** |     **984 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |       **Overlap8** | **10,083.5 ns** |   **130.10 ns** |  **68.04 ns** | **0.2029** |     **-** |     **-** |  **10,233 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **WindowInline** |    **614.6 ns** |    **12.12 ns** |   **6.34 ns** | **0.0060** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **WindowDeferred** |  **1,043.6 ns** |    **16.44 ns** |   **8.60 ns** | **0.0205** |     **-** |     **-** |     **888 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **ObjectInline** |    **658.3 ns** |    **13.45 ns** |   **7.03 ns** | **0.0065** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **ObjectDeferred** |  **1,058.1 ns** |    **40.48 ns** |  **21.17 ns** | **0.0214** |     **-** |     **-** |     **888 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |       **Overlap8** |  **8,042.5 ns** |   **217.19 ns** | **113.60 ns** | **0.1592** |     **-** |     **-** |   **7,448 B** |
