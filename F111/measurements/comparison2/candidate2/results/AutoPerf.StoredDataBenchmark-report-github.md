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
| **SerializeOrSave** |       **DataAbove4K** |   **1,109.92 ns** |    **110.847 ns** |     **57.975 ns** | **0.1077** |      **-** |      **-** |   **4,352 B** |
| **SerializeOrSave** |      **DataArray256** |   **2,314.98 ns** |     **59.823 ns** |     **31.289 ns** | **0.0230** |      **-** |      **-** |   **1,272 B** |
| **SerializeOrSave** |     **DataAscii128K** |  **87,397.84 ns** | **20,745.987 ns** | **10,850.552 ns** | **2.2866** | **2.2866** | **2.2866** | **131,385 B** |
| **SerializeOrSave** |      **DataAscii16K** |   **3,504.86 ns** |    **375.107 ns** |    **196.188 ns** | **0.4467** |      **-** |      **-** |  **16,680 B** |
| **SerializeOrSave** |       **DataAscii1K** |     **466.55 ns** |     **49.311 ns** |     **25.791 ns** | **0.0320** |      **-** |      **-** |   **1,320 B** |
| **SerializeOrSave** |          **DataAt4K** |   **1,210.49 ns** |    **323.255 ns** |    **169.069 ns** | **0.1098** |      **-** |      **-** |   **4,344 B** |
| **SerializeOrSave** |       **DataBelow4K** |   **1,117.21 ns** |    **135.579 ns** |     **70.911 ns** | **0.1170** |      **-** |      **-** |   **4,344 B** |
| **SerializeOrSave** |         **DataEmpty** |      **70.75 ns** |      **1.478 ns** |      **0.773 ns** | **0.0046** |      **-** |      **-** |     **200 B** |
| **SerializeOrSave** |     **DataEntries16** |   **2,258.57 ns** |    **263.127 ns** |    **137.621 ns** | **0.0231** |      **-** |      **-** |   **1,664 B** |
| **SerializeOrSave** |    **DataEntries256** |  **32,927.77 ns** |    **239.726 ns** |    **125.382 ns** | **0.3272** |      **-** |      **-** |  **22,786 B** |
| **SerializeOrSave** |          **DataEnum** |   **2,587.94 ns** |    **159.599 ns** |     **83.473 ns** | **0.0238** |      **-** |      **-** |   **1,296 B** |
| **SerializeOrSave** |    **DataEscaped16K** | **122,632.23 ns** |  **6,359.292 ns** |  **3,326.033 ns** | **2.3148** |      **-** |      **-** |  **72,399 B** |
| **SerializeOrSave** |        **DataNested** |   **2,578.40 ns** |     **99.855 ns** |     **52.226 ns** | **0.0255** |      **-** |      **-** |   **1,448 B** |
| **SerializeOrSave** |          **DataNull** |     **125.06 ns** |     **14.978 ns** |      **7.834 ns** | **0.0069** |      **-** |      **-** |     **264 B** |
| **SerializeOrSave** |        **DataScalar** |     **862.21 ns** |    **106.177 ns** |     **55.533 ns** | **0.0083** |      **-** |      **-** |     **536 B** |
| **SerializeOrSave** |    **DataUnicode16K** | **140,989.66 ns** | **13,063.197 ns** |  **6,832.305 ns** | **2.6596** | **2.6596** | **2.6596** |  **98,619 B** |
| **SerializeOrSave** |  **SessionAscii128K** | **157,677.46 ns** | **28,903.175 ns** | **15,116.920 ns** | **3.1250** | **3.1250** | **3.1250** | **262,599 B** |
| **SerializeOrSave** |   **SessionAscii16K** |   **8,076.21 ns** |  **2,621.108 ns** |  **1,370.890 ns** | **0.8260** |      **-** |      **-** |  **33,217 B** |
| **SerializeOrSave** |      **SessionEmpty** |      **59.36 ns** |      **8.872 ns** |      **4.640 ns** | **0.0018** |      **-** |      **-** |      **80 B** |
| **SerializeOrSave** | **SessionEntries256** |  **39,610.91 ns** |  **3,154.767 ns** |  **1,650.004 ns** | **1.1364** |      **-** |      **-** |  **45,426 B** |
| **SerializeOrSave** | **SessionEscaped16K** | **141,740.14 ns** |  **9,551.057 ns** |  **4,995.387 ns** | **4.1667** |      **-** |      **-** | **144,649 B** |
| **SerializeOrSave** |     **SessionNested** |   **3,160.29 ns** |    **316.578 ns** |    **165.576 ns** | **0.0559** |      **-** |      **-** |   **2,088 B** |
| **SerializeOrSave** |     **SessionScalar** |   **1,131.36 ns** |    **116.058 ns** |     **60.700 ns** | **0.0205** |      **-** |      **-** |     **928 B** |
| **SerializeOrSave** |     **ValueArray256** |   **4,136.58 ns** |  **1,023.230 ns** |    **535.169 ns** | **0.2494** |      **-** |      **-** |   **9,056 B** |
| **SerializeOrSave** |       **ValueNested** |   **3,280.26 ns** |    **291.745 ns** |    **152.588 ns** | **0.0654** |      **-** |      **-** |   **3,592 B** |
| **SerializeOrSave** |    **ValueString16K** |  **11,233.02 ns** |  **1,103.971 ns** |    **577.398 ns** | **3.2955** | **0.2273** |      **-** | **115,745 B** |
| **SerializeOrSave** |  **ValueStringSmall** |     **359.07 ns** |     **77.596 ns** |     **40.584 ns** | **0.0219** |      **-** |      **-** |     **888 B** |
| **SerializeOrSave** |   **ValueUnicode16K** | **315,222.17 ns** | **42,784.207 ns** | **22,376.967 ns** | **5.9524** | **5.9524** | **5.9524** | **492,595 B** |
