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
| **ApplyPatch** |       **Assignable_1** |     **202.9 ns** |    **10.79 ns** |     **5.64 ns** |      **-** |     **-** |     **-** |     **168 B** |
| **ApplyPatch** |    **ConvertObject_1** |     **811.5 ns** |    **54.30 ns** |    **28.40 ns** | **0.0313** |     **-** |     **-** |   **1,208 B** |
| **ApplyPatch** |   **ConvertObject_16** |   **1,281.2 ns** |    **18.89 ns** |     **9.88 ns** | **0.0262** |     **-** |     **-** |   **1,440 B** |
| **ApplyPatch** |  **ConvertObject_256** |   **7,929.6 ns** |   **297.66 ns** |   **155.68 ns** | **0.0777** |     **-** |     **-** |   **4,896 B** |
| **ApplyPatch** | **ConvertObject_4096** | **115,218.1 ns** | **1,947.38 ns** | **1,018.52 ns** | **1.1574** |     **-** |     **-** |  **58,758 B** |
| **ApplyPatch** |    **ConvertScalar_1** |     **265.0 ns** |    **13.20 ns** |     **6.90 ns** | **0.0054** |     **-** |     **-** |     **280 B** |
| **ApplyPatch** |        **CopyArray_1** |     **463.3 ns** |    **21.18 ns** |    **11.08 ns** | **0.0092** |     **-** |     **-** |     **504 B** |
| **ApplyPatch** |       **CopyArray_16** |     **960.3 ns** |    **61.21 ns** |    **32.01 ns** | **0.0188** |     **-** |     **-** |     **704 B** |
| **ApplyPatch** |      **CopyArray_256** |   **7,525.0 ns** |   **726.34 ns** |   **379.89 ns** | **0.0732** |     **-** |     **-** |   **3,680 B** |
| **ApplyPatch** |     **CopyArray_4096** | **112,843.1 ns** | **1,799.05 ns** |   **940.94 ns** | **1.1161** |     **-** |     **-** |  **49,863 B** |
| **ApplyPatch** |       **CopyObject_1** |     **926.6 ns** |   **117.56 ns** |    **61.49 ns** | **0.0356** |     **-** |     **-** |   **1,328 B** |
| **ApplyPatch** |      **CopyObject_16** |   **1,406.9 ns** |    **96.66 ns** |    **50.56 ns** | **0.0281** |     **-** |     **-** |   **1,560 B** |
| **ApplyPatch** |     **CopyObject_256** |   **7,915.0 ns** |   **148.95 ns** |    **77.90 ns** | **0.0782** |     **-** |     **-** |   **5,016 B** |
| **ApplyPatch** |    **CopyObject_4096** | **114,138.2 ns** | **2,921.78 ns** | **1,528.15 ns** | **1.1792** |     **-** |     **-** |  **58,879 B** |
| **ApplyPatch** |      **JsonElement_1** |     **474.6 ns** |    **11.65 ns** |     **6.09 ns** | **0.0188** |     **-** |     **-** |     **840 B** |
| **ApplyPatch** |     **JsonElement_16** |     **836.3 ns** |    **17.62 ns** |     **9.21 ns** | **0.0249** |     **-** |     **-** |   **1,072 B** |
| **ApplyPatch** |    **JsonElement_256** |   **5,882.3 ns** |    **83.87 ns** |    **43.87 ns** | **0.1158** |     **-** |     **-** |   **4,528 B** |
| **ApplyPatch** |   **JsonElement_4096** |  **87,675.1 ns** |   **739.09 ns** |   **386.56 ns** | **0.8562** |     **-** |     **-** |  **58,389 B** |
