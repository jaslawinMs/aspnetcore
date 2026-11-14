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
| **ApplyPatch** |       **Assignable_1** |     **303.1 ns** |    **53.32 ns** |    **27.89 ns** |      **-** |     **-** |     **-** |     **208 B** |
| **ApplyPatch** |    **ConvertObject_1** |     **992.7 ns** |    **44.55 ns** |    **23.30 ns** | **0.0296** |     **-** |     **-** |   **1,280 B** |
| **ApplyPatch** |   **ConvertObject_16** |   **1,843.0 ns** |    **99.40 ns** |    **51.99 ns** | **0.0369** |     **-** |     **-** |   **1,512 B** |
| **ApplyPatch** |  **ConvertObject_256** |  **12,038.2 ns** |   **356.37 ns** |   **186.39 ns** | **0.1200** |     **-** |     **-** |   **4,969 B** |
| **ApplyPatch** | **ConvertObject_4096** | **177,868.5 ns** | **2,792.50 ns** | **1,460.53 ns** |      **-** |     **-** |     **-** |  **58,825 B** |
| **ApplyPatch** |    **ConvertScalar_1** |     **343.1 ns** |     **4.58 ns** |     **2.40 ns** | **0.0069** |     **-** |     **-** |     **352 B** |
| **ApplyPatch** |        **CopyArray_1** |     **631.5 ns** |    **48.40 ns** |    **25.32 ns** | **0.0125** |     **-** |     **-** |     **576 B** |
| **ApplyPatch** |       **CopyArray_16** |   **1,312.6 ns** |    **48.34 ns** |    **25.28 ns** | **0.0131** |     **-** |     **-** |     **776 B** |
| **ApplyPatch** |      **CopyArray_256** |  **11,082.0 ns** |   **354.66 ns** |   **185.49 ns** |      **-** |     **-** |     **-** |   **3,753 B** |
| **ApplyPatch** |     **CopyArray_4096** | **173,171.2 ns** | **2,296.84 ns** | **1,201.29 ns** |      **-** |     **-** |     **-** |  **49,938 B** |
| **ApplyPatch** |       **CopyObject_1** |   **1,097.2 ns** |    **59.70 ns** |    **31.22 ns** | **0.0320** |     **-** |     **-** |   **1,400 B** |
| **ApplyPatch** |      **CopyObject_16** |   **1,914.9 ns** |    **38.20 ns** |    **19.98 ns** | **0.0379** |     **-** |     **-** |   **1,632 B** |
| **ApplyPatch** |     **CopyObject_256** |  **12,087.5 ns** |   **129.27 ns** |    **67.61 ns** | **0.1209** |     **-** |     **-** |   **5,089 B** |
| **ApplyPatch** |    **CopyObject_4096** | **176,824.6 ns** | **1,740.52 ns** |   **910.33 ns** |      **-** |     **-** |     **-** |  **58,954 B** |
| **ApplyPatch** |      **JsonElement_1** |     **464.4 ns** |    **11.40 ns** |     **5.96 ns** | **0.0194** |     **-** |     **-** |     **840 B** |
| **ApplyPatch** |     **JsonElement_16** |     **831.2 ns** |    **15.79 ns** |     **8.26 ns** | **0.0249** |     **-** |     **-** |   **1,072 B** |
| **ApplyPatch** |    **JsonElement_256** |   **5,903.1 ns** |   **117.04 ns** |    **61.21 ns** | **0.1188** |     **-** |     **-** |   **4,528 B** |
| **ApplyPatch** |   **JsonElement_4096** |  **88,367.2 ns** | **4,293.82 ns** | **2,245.75 ns** | **0.8681** |     **-** |     **-** |  **58,389 B** |
