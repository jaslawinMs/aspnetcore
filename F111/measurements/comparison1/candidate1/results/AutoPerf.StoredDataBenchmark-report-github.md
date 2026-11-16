``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|          Method |              Case |          Mean |         Error |        StdDev |  Gen 0 |  Gen 1 |  Gen 2 | Allocated |
|---------------- |------------------ |--------------:|--------------:|--------------:|-------:|-------:|-------:|----------:|
| **SerializeOrSave** |       **DataAbove4K** |   **2,381.95 ns** |    **836.766 ns** |    **437.645 ns** | **0.4485** |      **-** |      **-** |  **17,072 B** |
| **SerializeOrSave** |      **DataArray256** |   **2,920.32 ns** |    **167.465 ns** |     **87.587 ns** | **0.1435** |      **-** |      **-** |   **5,928 B** |
| **SerializeOrSave** |     **DataAscii128K** | **165,818.91 ns** | **23,996.908 ns** | **12,550.847 ns** | **3.6765** | **3.6765** | **3.6765** | **525,173 B** |
| **SerializeOrSave** |      **DataAscii16K** |   **6,978.56 ns** |    **970.021 ns** |    **507.340 ns** | **1.7930** | **0.0640** |      **-** |  **66,401 B** |
| **SerializeOrSave** |       **DataAscii1K** |     **897.66 ns** |    **104.683 ns** |     **54.751 ns** | **0.1555** |      **-** |      **-** |   **5,976 B** |
| **SerializeOrSave** |          **DataAt4K** |   **2,165.62 ns** |    **313.718 ns** |    **164.080 ns** | **0.4303** |      **-** |      **-** |  **17,064 B** |
| **SerializeOrSave** |       **DataBelow4K** |   **2,149.38 ns** |    **185.470 ns** |     **97.004 ns** | **0.4475** |      **-** |      **-** |  **17,064 B** |
| **SerializeOrSave** |         **DataEmpty** |      **79.64 ns** |     **11.197 ns** |      **5.856 ns** | **0.0122** |      **-** |      **-** |     **480 B** |
| **SerializeOrSave** |     **DataEntries16** |   **2,786.86 ns** |    **157.727 ns** |     **82.494 ns** | **0.1346** |      **-** |      **-** |   **5,600 B** |
| **SerializeOrSave** |    **DataEntries256** |  **40,070.96 ns** |  **5,358.893 ns** |  **2,802.805 ns** | **2.2321** |      **-** |      **-** |  **88,259 B** |
| **SerializeOrSave** |          **DataEnum** |   **3,294.11 ns** |    **107.639 ns** |     **56.297 ns** | **0.1590** |      **-** |      **-** |   **5,952 B** |
| **SerializeOrSave** |    **DataEscaped16K** | **177,166.16 ns** | **28,500.476 ns** | **14,906.300 ns** | **3.9063** | **1.9531** | **1.9531** | **171,289 B** |
| **SerializeOrSave** |        **DataNested** |   **2,806.43 ns** |     **85.424 ns** |     **44.678 ns** | **0.0831** |      **-** |      **-** |   **3,312 B** |
| **SerializeOrSave** |          **DataNull** |     **122.74 ns** |     **11.696 ns** |      **6.117 ns** | **0.0143** |      **-** |      **-** |     **544 B** |
| **SerializeOrSave** |        **DataScalar** |   **1,057.52 ns** |    **123.670 ns** |     **64.682 ns** | **0.0601** |      **-** |      **-** |   **2,400 B** |
| **SerializeOrSave** |    **DataUnicode16K** | **238,676.68 ns** | **14,791.524 ns** |  **7,736.253 ns** | **4.8077** | **4.8077** | **4.8077** | **394,626 B** |
| **SerializeOrSave** |  **SessionAscii128K** | **235,120.04 ns** | **42,627.062 ns** | **22,294.777 ns** | **4.8077** | **4.8077** | **4.8077** | **656,380 B** |
| **SerializeOrSave** |   **SessionAscii16K** |   **8,425.64 ns** |  **1,295.005 ns** |    **677.313 ns** | **2.2195** | **0.0888** |      **-** |  **82,937 B** |
| **SerializeOrSave** |      **SessionEmpty** |      **52.73 ns** |      **2.695 ns** |      **1.410 ns** | **0.0017** |      **-** |      **-** |      **80 B** |
| **SerializeOrSave** | **SessionEntries256** |  **41,855.72 ns** |  **4,749.779 ns** |  **2,484.226 ns** | **2.9966** |      **-** |      **-** | **110,899 B** |
| **SerializeOrSave** | **SessionEscaped16K** | **188,870.21 ns** | **28,323.977 ns** | **14,813.988 ns** | **5.8594** | **1.9531** | **1.9531** | **243,535 B** |
| **SerializeOrSave** |     **SessionNested** |   **3,110.34 ns** |    **350.985 ns** |    **183.572 ns** | **0.0894** |      **-** |      **-** |   **3,952 B** |
| **SerializeOrSave** |     **SessionScalar** |   **1,246.49 ns** |    **168.978 ns** |     **88.379 ns** | **0.0709** |      **-** |      **-** |   **2,792 B** |
| **SerializeOrSave** |     **ValueArray256** |   **3,386.71 ns** |    **138.957 ns** |     **72.677 ns** | **0.2318** |      **-** |      **-** |   **9,056 B** |
| **SerializeOrSave** |       **ValueNested** |   **3,001.84 ns** |     **86.769 ns** |     **45.382 ns** | **0.0872** |      **-** |      **-** |   **3,592 B** |
| **SerializeOrSave** |    **ValueString16K** |  **10,936.55 ns** |  **1,364.937 ns** |    **713.889 ns** | **3.3557** | **0.3146** |      **-** | **115,745 B** |
| **SerializeOrSave** |  **ValueStringSmall** |     **268.30 ns** |     **24.724 ns** |     **12.931 ns** | **0.0232** |      **-** |      **-** |     **888 B** |
| **SerializeOrSave** |   **ValueUnicode16K** | **294,112.30 ns** | **17,040.316 ns** |  **8,912.415 ns** | **6.2500** | **6.2500** | **6.2500** | **492,594 B** |
