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
| **ApplyPatch** |       **Assignable_1** |     **276.2 ns** |   **143.11 ns** |    **74.85 ns** |      **-** |     **-** |     **-** |     **168 B** |
| **ApplyPatch** |    **ConvertObject_1** |   **1,441.5 ns** | **1,043.52 ns** |   **545.78 ns** |      **-** |     **-** |     **-** |   **1,280 B** |
| **ApplyPatch** |   **ConvertObject_16** |   **1,894.9 ns** |    **91.58 ns** |    **47.90 ns** | **0.0365** |     **-** |     **-** |   **1,512 B** |
| **ApplyPatch** |  **ConvertObject_256** |  **12,398.9 ns** |   **465.67 ns** |   **243.56 ns** | **0.1243** |     **-** |     **-** |   **4,969 B** |
| **ApplyPatch** | **ConvertObject_4096** | **181,068.8 ns** | **3,036.98 ns** | **1,588.40 ns** |      **-** |     **-** |     **-** |  **58,833 B** |
| **ApplyPatch** |    **ConvertScalar_1** |     **346.1 ns** |    **31.98 ns** |    **16.73 ns** | **0.0067** |     **-** |     **-** |     **352 B** |
| **ApplyPatch** |        **CopyArray_1** |     **638.0 ns** |    **49.86 ns** |    **26.08 ns** | **0.0125** |     **-** |     **-** |     **576 B** |
| **ApplyPatch** |       **CopyArray_16** |   **1,337.2 ns** |    **21.98 ns** |    **11.50 ns** | **0.0132** |     **-** |     **-** |     **776 B** |
| **ApplyPatch** |      **CopyArray_256** |  **11,338.6 ns** |   **336.58 ns** |   **176.04 ns** |      **-** |     **-** |     **-** |   **3,753 B** |
| **ApplyPatch** |     **CopyArray_4096** | **178,806.4 ns** | **4,542.10 ns** | **2,375.60 ns** |      **-** |     **-** |     **-** |  **49,938 B** |
| **ApplyPatch** |       **CopyObject_1** |   **1,156.2 ns** |   **160.02 ns** |    **83.69 ns** | **0.0327** |     **-** |     **-** |   **1,400 B** |
| **ApplyPatch** |      **CopyObject_16** |   **2,071.4 ns** |   **247.61 ns** |   **129.50 ns** | **0.0438** |     **-** |     **-** |   **1,632 B** |
| **ApplyPatch** |     **CopyObject_256** |  **12,400.8 ns** |   **629.22 ns** |   **329.09 ns** | **0.1235** |     **-** |     **-** |   **5,089 B** |
| **ApplyPatch** |    **CopyObject_4096** | **181,676.7 ns** | **5,085.76 ns** | **2,659.95 ns** |      **-** |     **-** |     **-** |  **58,954 B** |
| **ApplyPatch** |      **JsonElement_1** |     **488.3 ns** |    **27.27 ns** |    **14.26 ns** | **0.0172** |     **-** |     **-** |     **840 B** |
| **ApplyPatch** |     **JsonElement_16** |     **882.7 ns** |    **88.45 ns** |    **46.26 ns** | **0.0257** |     **-** |     **-** |   **1,072 B** |
| **ApplyPatch** |    **JsonElement_256** |   **5,921.5 ns** |   **218.76 ns** |   **114.42 ns** | **0.0635** |     **-** |     **-** |   **4,528 B** |
| **ApplyPatch** |   **JsonElement_4096** |  **89,759.5 ns** | **3,815.01 ns** | **1,995.33 ns** | **0.8929** |     **-** |     **-** |  **58,389 B** |
