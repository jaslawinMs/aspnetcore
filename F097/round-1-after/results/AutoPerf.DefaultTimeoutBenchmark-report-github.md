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
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **WindowInline** |  **1,845.7 ns** | **1,522.66 ns** | **796.38 ns** |      **-** |     **-** |     **-** |     **504 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **WindowDeferred** |  **1,057.6 ns** |    **21.19 ns** |  **11.08 ns** | **0.0208** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **ObjectInline** |    **796.6 ns** |    **14.05 ns** |   **7.35 ns** | **0.0080** |     **-** |     **-** |     **512 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **ObjectDeferred** |  **1,072.4 ns** |    **35.47 ns** |  **18.55 ns** | **0.0209** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |       **Overlap8** |  **9,158.1 ns** |   **152.00 ns** |  **79.50 ns** | **0.1799** |     **-** |     **-** |   **9,080 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **WindowInline** |    **631.4 ns** |     **7.08 ns** |   **3.70 ns** | **0.0062** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **WindowDeferred** |    **877.5 ns** |     **9.95 ns** |   **5.20 ns** | **0.0173** |     **-** |     **-** |     **744 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **ObjectInline** |    **639.2 ns** |     **8.15 ns** |   **4.26 ns** | **0.0063** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **ObjectDeferred** |    **888.1 ns** |    **10.47 ns** |   **5.48 ns** | **0.0175** |     **-** |     **-** |     **744 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |       **Overlap8** |  **6,920.8 ns** |    **99.94 ns** |  **52.27 ns** | **0.1378** |     **-** |     **-** |   **6,296 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **WindowInline** |    **841.4 ns** |    **27.19 ns** |  **14.22 ns** | **0.0082** |     **-** |     **-** |     **488 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **WindowDeferred** |  **1,230.3 ns** |    **23.60 ns** |  **12.35 ns** | **0.0248** |     **-** |     **-** |     **960 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **ObjectInline** |    **834.4 ns** |     **7.14 ns** |   **3.74 ns** | **0.0083** |     **-** |     **-** |     **488 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **ObjectDeferred** |  **1,271.6 ns** |   **112.30 ns** |  **58.74 ns** | **0.0249** |     **-** |     **-** |     **960 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |       **Overlap8** | **10,491.7 ns** |   **136.94 ns** |  **71.62 ns** | **0.2066** |     **-** |     **-** |  **10,041 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **WindowInline** |    **670.0 ns** |    **12.94 ns** |   **6.77 ns** | **0.0067** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **WindowDeferred** |  **1,071.8 ns** |    **19.27 ns** |  **10.08 ns** | **0.0212** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **ObjectInline** |    **668.6 ns** |     **4.34 ns** |   **2.27 ns** | **0.0067** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **ObjectDeferred** |  **1,075.9 ns** |    **25.86 ns** |  **13.52 ns** | **0.0211** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |       **Overlap8** |  **8,169.8 ns** |   **144.55 ns** |  **75.60 ns** | **0.1619** |     **-** |     **-** |   **7,256 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **WindowInline** |    **946.9 ns** |    **15.31 ns** |   **8.01 ns** | **0.0094** |     **-** |     **-** |     **576 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **WindowDeferred** |  **1,219.0 ns** |    **23.41 ns** |  **12.25 ns** | **0.0241** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **ObjectInline** |    **947.0 ns** |    **15.00 ns** |   **7.85 ns** | **0.0094** |     **-** |     **-** |     **576 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **ObjectDeferred** |  **1,223.8 ns** |    **26.84 ns** |  **14.04 ns** | **0.0243** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |       **Overlap8** | **10,372.5 ns** |   **165.50 ns** |  **86.56 ns** | **0.2073** |     **-** |     **-** |   **9,657 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **WindowInline** |    **762.5 ns** |    **15.93 ns** |   **8.33 ns** | **0.0075** |     **-** |     **-** |     **480 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **WindowDeferred** |  **1,052.5 ns** |    **25.37 ns** |  **13.27 ns** | **0.0208** |     **-** |     **-** |     **816 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **ObjectInline** |    **754.1 ns** |    **10.21 ns** |   **5.34 ns** | **0.0074** |     **-** |     **-** |     **480 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **ObjectDeferred** |  **1,055.7 ns** |    **67.64 ns** |  **35.38 ns** | **0.0206** |     **-** |     **-** |     **816 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |       **Overlap8** |  **8,480.8 ns** |   **887.88 ns** | **464.38 ns** | **0.1621** |     **-** |     **-** |   **6,872 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **WindowInline** |    **607.7 ns** |     **8.82 ns** |   **4.61 ns** | **0.0061** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **WindowDeferred** |    **885.6 ns** |   **185.55 ns** |  **97.05 ns** | **0.0168** |     **-** |     **-** |     **768 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **ObjectInline** |    **619.2 ns** |    **28.53 ns** |  **14.92 ns** | **0.0061** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **ObjectDeferred** |    **850.3 ns** |    **16.03 ns** |   **8.38 ns** | **0.0169** |     **-** |     **-** |     **768 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |       **Overlap8** |  **7,555.2 ns** |   **185.15 ns** |  **96.84 ns** | **0.2232** |     **-** |     **-** |   **8,504 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **WindowInline** |    **446.9 ns** |    **11.25 ns** |   **5.88 ns** | **0.0089** |     **-** |     **-** |     **344 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **WindowDeferred** |    **686.7 ns** |    **63.72 ns** |  **33.33 ns** | **0.0133** |     **-** |     **-** |     **672 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **ObjectInline** |    **454.2 ns** |     **5.74 ns** |   **3.00 ns** | **0.0090** |     **-** |     **-** |     **344 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **ObjectDeferred** |    **683.3 ns** |    **11.45 ns** |   **5.99 ns** | **0.0136** |     **-** |     **-** |     **672 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |       **Overlap8** |  **5,582.2 ns** |   **367.35 ns** | **192.13 ns** | **0.1072** |     **-** |     **-** |   **5,720 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **WindowInline** |    **774.6 ns** |    **15.07 ns** |   **7.88 ns** | **0.0079** |     **-** |     **-** |     **512 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **WindowDeferred** |  **1,236.3 ns** |   **101.81 ns** |  **53.25 ns** | **0.0241** |     **-** |     **-** |     **984 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **ObjectInline** |    **817.2 ns** |    **37.48 ns** |  **19.60 ns** | **0.0081** |     **-** |     **-** |     **512 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **ObjectDeferred** |  **1,239.0 ns** |    **11.58 ns** |   **6.05 ns** | **0.0244** |     **-** |     **-** |     **984 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |       **Overlap8** | **10,193.4 ns** |   **128.40 ns** |  **67.16 ns** | **0.2033** |     **-** |     **-** |  **10,233 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **WindowInline** |    **609.0 ns** |    **10.73 ns** |   **5.61 ns** | **0.0061** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **WindowDeferred** |  **1,044.8 ns** |    **19.62 ns** |  **10.26 ns** | **0.0208** |     **-** |     **-** |     **888 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **ObjectInline** |    **648.0 ns** |    **15.35 ns** |   **8.03 ns** | **0.0064** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **ObjectDeferred** |  **1,058.8 ns** |    **29.71 ns** |  **15.54 ns** | **0.0209** |     **-** |     **-** |     **888 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |       **Overlap8** |  **8,077.7 ns** |   **142.24 ns** |  **74.40 ns** | **0.1611** |     **-** |     **-** |   **7,448 B** |
