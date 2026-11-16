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
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **WindowInline** |  **1,604.1 ns** | **1,357.46 ns** | **709.98 ns** |      **-** |     **-** |     **-** |     **504 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **WindowDeferred** |  **1,060.3 ns** |    **40.35 ns** |  **21.11 ns** | **0.0205** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |   **ObjectInline** |    **817.2 ns** |    **10.79 ns** |   **5.64 ns** | **0.0080** |     **-** |     **-** |     **512 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** | **ObjectDeferred** |  **1,056.4 ns** |    **18.21 ns** |   **9.52 ns** | **0.0205** |     **-** |     **-** |     **840 B** |
| **ActualDefaultTimeout** |      **Invoke** |       **Finite** |       **Overlap8** |  **9,010.2 ns** |   **233.04 ns** | **121.88 ns** | **0.1756** |     **-** |     **-** |   **9,080 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **WindowInline** |    **645.2 ns** |    **11.60 ns** |   **6.07 ns** | **0.0063** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **WindowDeferred** |    **880.1 ns** |    **17.76 ns** |   **9.29 ns** | **0.0174** |     **-** |     **-** |     **744 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |   **ObjectInline** |    **644.2 ns** |    **13.70 ns** |   **7.17 ns** | **0.0063** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** | **ObjectDeferred** |    **892.7 ns** |    **25.14 ns** |  **13.15 ns** | **0.0175** |     **-** |     **-** |     **744 B** |
| **ActualDefaultTimeout** |      **Invoke** | **Unconfigured** |       **Overlap8** |  **6,896.2 ns** |   **193.06 ns** | **100.97 ns** | **0.1357** |     **-** |     **-** |   **6,296 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **WindowInline** |    **846.7 ns** |     **8.80 ns** |   **4.60 ns** | **0.0084** |     **-** |     **-** |     **488 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **WindowDeferred** |  **1,220.6 ns** |    **25.14 ns** |  **13.15 ns** | **0.0242** |     **-** |     **-** |     **960 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |   **ObjectInline** |    **847.1 ns** |     **6.96 ns** |   **3.64 ns** | **0.0084** |     **-** |     **-** |     **488 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** | **ObjectDeferred** |  **1,234.5 ns** |    **14.05 ns** |   **7.35 ns** | **0.0246** |     **-** |     **-** |     **960 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** |       **Finite** |       **Overlap8** | **10,431.5 ns** |   **249.44 ns** | **130.46 ns** | **0.2104** |     **-** |     **-** |  **10,041 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **WindowInline** |    **684.1 ns** |    **20.90 ns** |  **10.93 ns** | **0.0067** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **WindowDeferred** |  **1,065.5 ns** |    **21.28 ns** |  **11.13 ns** | **0.0207** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |   **ObjectInline** |    **687.4 ns** |    **18.62 ns** |   **9.74 ns** | **0.0067** |     **-** |     **-** |     **392 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** | **ObjectDeferred** |  **1,068.9 ns** |    **16.17 ns** |   **8.46 ns** | **0.0206** |     **-** |     **-** |     **864 B** |
| **ActualDefaultTimeout** |  **InvokeVoid** | **Unconfigured** |       **Overlap8** |  **8,270.9 ns** |   **176.61 ns** |  **92.37 ns** | **0.1667** |     **-** |     **-** |   **7,256 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **WindowInline** |    **929.8 ns** |    **11.49 ns** |   **6.01 ns** | **0.0093** |     **-** |     **-** |     **576 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **WindowDeferred** |  **1,231.6 ns** |    **35.65 ns** |  **18.64 ns** | **0.0241** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |   **ObjectInline** |    **941.7 ns** |    **13.55 ns** |   **7.09 ns** | **0.0095** |     **-** |     **-** |     **576 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** | **ObjectDeferred** |  **1,220.1 ns** |    **14.16 ns** |   **7.40 ns** | **0.0241** |     **-** |     **-** |     **912 B** |
| **ActualDefaultTimeout** | **Constructor** |       **Finite** |       **Overlap8** | **10,588.3 ns** |   **125.95 ns** |  **65.87 ns** | **0.2119** |     **-** |     **-** |   **9,657 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **WindowInline** |    **762.8 ns** |    **16.72 ns** |   **8.75 ns** | **0.0076** |     **-** |     **-** |     **480 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **WindowDeferred** |  **1,040.2 ns** |    **15.15 ns** |   **7.92 ns** | **0.0207** |     **-** |     **-** |     **816 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |   **ObjectInline** |    **893.3 ns** |   **211.12 ns** | **110.42 ns** | **0.0075** |     **-** |     **-** |     **480 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** | **ObjectDeferred** |  **1,063.9 ns** |    **88.42 ns** |  **46.25 ns** | **0.0206** |     **-** |     **-** |     **816 B** |
| **ActualDefaultTimeout** | **Constructor** | **Unconfigured** |       **Overlap8** |  **8,141.4 ns** |   **134.91 ns** |  **70.56 ns** | **0.1586** |     **-** |     **-** |   **6,872 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **WindowInline** |    **611.8 ns** |     **9.12 ns** |   **4.77 ns** | **0.0060** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **WindowDeferred** |    **839.7 ns** |    **15.08 ns** |   **7.89 ns** | **0.0165** |     **-** |     **-** |     **768 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |   **ObjectInline** |    **605.0 ns** |     **6.70 ns** |   **3.50 ns** | **0.0060** |     **-** |     **-** |     **440 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** | **ObjectDeferred** |    **845.0 ns** |    **12.82 ns** |   **6.70 ns** | **0.0168** |     **-** |     **-** |     **768 B** |
| **ActualDefaultTimeout** |         **Get** |       **Finite** |       **Overlap8** |  **7,534.4 ns** |   **644.24 ns** | **336.95 ns** | **0.2222** |     **-** |     **-** |   **8,504 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **WindowInline** |    **447.9 ns** |     **7.39 ns** |   **3.87 ns** | **0.0090** |     **-** |     **-** |     **344 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **WindowDeferred** |    **673.3 ns** |    **18.63 ns** |   **9.74 ns** | **0.0132** |     **-** |     **-** |     **672 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |   **ObjectInline** |    **449.7 ns** |     **7.44 ns** |   **3.89 ns** | **0.0088** |     **-** |     **-** |     **344 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** | **ObjectDeferred** |    **673.2 ns** |    **15.97 ns** |   **8.35 ns** | **0.0141** |     **-** |     **-** |     **672 B** |
| **ActualDefaultTimeout** |         **Get** | **Unconfigured** |       **Overlap8** |  **5,483.2 ns** |    **67.34 ns** |  **35.22 ns** | **0.1079** |     **-** |     **-** |   **5,720 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **WindowInline** |    **776.6 ns** |     **7.99 ns** |   **4.18 ns** | **0.0077** |     **-** |     **-** |     **512 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **WindowDeferred** |  **1,208.9 ns** |    **54.28 ns** |  **28.39 ns** | **0.0237** |     **-** |     **-** |     **984 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |   **ObjectInline** |    **798.1 ns** |    **13.89 ns** |   **7.26 ns** | **0.0079** |     **-** |     **-** |     **512 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** | **ObjectDeferred** |  **1,204.3 ns** |    **18.16 ns** |   **9.50 ns** | **0.0237** |     **-** |     **-** |     **984 B** |
| **ActualDefaultTimeout** |         **Set** |       **Finite** |       **Overlap8** | **10,094.1 ns** |   **352.35 ns** | **184.29 ns** | **0.1990** |     **-** |     **-** |  **10,233 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **WindowInline** |    **626.0 ns** |    **54.53 ns** |  **28.52 ns** | **0.0061** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **WindowDeferred** |  **1,030.4 ns** |    **25.18 ns** |  **13.17 ns** | **0.0202** |     **-** |     **-** |     **888 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |   **ObjectInline** |    **636.7 ns** |     **8.51 ns** |   **4.45 ns** | **0.0063** |     **-** |     **-** |     **416 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** | **ObjectDeferred** |  **1,056.4 ns** |    **50.04 ns** |  **26.17 ns** | **0.0204** |     **-** |     **-** |     **888 B** |
| **ActualDefaultTimeout** |         **Set** | **Unconfigured** |       **Overlap8** |  **7,846.6 ns** |   **154.90 ns** |  **81.02 ns** | **0.1568** |     **-** |     **-** |   **7,448 B** |
