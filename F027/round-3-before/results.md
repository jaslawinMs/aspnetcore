``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|     Method |               Case |         Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------- |------------------- |-------------:|------------:|------------:|-------:|------:|------:|----------:|
| **ApplyPatch** |       **Assignable_1** |     **106.5 ns** |    **19.00 ns** |     **9.94 ns** | **0.0040** |     **-** |     **-** |     **168 B** |
| **ApplyPatch** |    **ConvertObject_1** |   **1,064.9 ns** |   **149.24 ns** |    **78.06 ns** | **0.0290** |     **-** |     **-** |   **1,280 B** |
| **ApplyPatch** |   **ConvertObject_16** |   **1,962.8 ns** |   **163.30 ns** |    **85.41 ns** | **0.0370** |     **-** |     **-** |   **1,512 B** |
| **ApplyPatch** |  **ConvertObject_256** |  **12,351.7 ns** |   **423.30 ns** |   **221.40 ns** | **0.1228** |     **-** |     **-** |   **4,969 B** |
| **ApplyPatch** | **ConvertObject_4096** | **181,309.7 ns** | **1,773.64 ns** |   **927.65 ns** |      **-** |     **-** |     **-** |  **58,830 B** |
| **ApplyPatch** |    **ConvertScalar_1** |     **333.5 ns** |    **19.67 ns** |    **10.29 ns** | **0.0067** |     **-** |     **-** |     **352 B** |
| **ApplyPatch** |        **CopyArray_1** |     **663.8 ns** |    **50.50 ns** |    **26.41 ns** | **0.0124** |     **-** |     **-** |     **576 B** |
| **ApplyPatch** |       **CopyArray_16** |   **1,348.2 ns** |    **18.91 ns** |     **9.89 ns** | **0.0134** |     **-** |     **-** |     **776 B** |
| **ApplyPatch** |      **CopyArray_256** |  **11,436.4 ns** |   **202.27 ns** |   **105.79 ns** |      **-** |     **-** |     **-** |   **3,753 B** |
| **ApplyPatch** |     **CopyArray_4096** | **178,153.2 ns** | **4,036.60 ns** | **2,111.22 ns** |      **-** |     **-** |     **-** |  **49,938 B** |
| **ApplyPatch** |       **CopyObject_1** |   **1,042.3 ns** |    **13.36 ns** |     **6.99 ns** | **0.0316** |     **-** |     **-** |   **1,400 B** |
| **ApplyPatch** |      **CopyObject_16** |   **1,972.9 ns** |    **85.86 ns** |    **44.90 ns** | **0.0389** |     **-** |     **-** |   **1,632 B** |
| **ApplyPatch** |     **CopyObject_256** |  **12,306.4 ns** |   **164.33 ns** |    **85.95 ns** | **0.1289** |     **-** |     **-** |   **5,089 B** |
| **ApplyPatch** |    **CopyObject_4096** | **181,839.4 ns** | **1,644.57 ns** |   **860.14 ns** |      **-** |     **-** |     **-** |  **58,955 B** |
| **ApplyPatch** |      **JsonElement_1** |     **485.5 ns** |    **91.39 ns** |    **47.80 ns** | **0.0206** |     **-** |     **-** |     **840 B** |
| **ApplyPatch** |     **JsonElement_16** |     **819.0 ns** |    **45.54 ns** |    **23.82 ns** | **0.0239** |     **-** |     **-** |   **1,072 B** |
| **ApplyPatch** |    **JsonElement_256** |   **6,048.1 ns** |   **353.81 ns** |   **185.05 ns** | **0.1186** |     **-** |     **-** |   **4,528 B** |
| **ApplyPatch** |   **JsonElement_4096** |  **87,051.8 ns** | **1,486.60 ns** |   **777.52 ns** | **0.8681** |     **-** |     **-** |  **58,389 B** |
