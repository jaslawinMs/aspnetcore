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
| **ApplyPatch** |       **Assignable_1** |     **412.4 ns** |    **45.62 ns** |    **23.86 ns** |      **-** |     **-** |     **-** |     **168 B** |
| **ApplyPatch** |    **ConvertObject_1** |     **794.6 ns** |   **104.83 ns** |    **54.83 ns** | **0.0316** |     **-** |     **-** |   **1,208 B** |
| **ApplyPatch** |   **ConvertObject_16** |   **1,339.4 ns** |    **68.42 ns** |    **35.79 ns** | **0.0263** |     **-** |     **-** |   **1,440 B** |
| **ApplyPatch** |  **ConvertObject_256** |   **7,896.9 ns** |   **100.16 ns** |    **52.39 ns** | **0.0789** |     **-** |     **-** |   **4,896 B** |
| **ApplyPatch** | **ConvertObject_4096** | **114,258.1 ns** | **1,064.86 ns** |   **556.94 ns** | **1.1161** |     **-** |     **-** |  **58,754 B** |
| **ApplyPatch** |    **ConvertScalar_1** |     **265.1 ns** |    **14.58 ns** |     **7.62 ns** | **0.0071** |     **-** |     **-** |     **280 B** |
| **ApplyPatch** |        **CopyArray_1** |     **464.2 ns** |    **38.53 ns** |    **20.15 ns** | **0.0092** |     **-** |     **-** |     **504 B** |
| **ApplyPatch** |       **CopyArray_16** |     **959.6 ns** |    **68.07 ns** |    **35.60 ns** | **0.0095** |     **-** |     **-** |     **704 B** |
| **ApplyPatch** |      **CopyArray_256** |   **7,296.0 ns** |    **86.62 ns** |    **45.30 ns** | **0.0729** |     **-** |     **-** |   **3,680 B** |
| **ApplyPatch** |     **CopyArray_4096** | **112,135.7 ns** | **2,215.64 ns** | **1,158.82 ns** | **1.1161** |     **-** |     **-** |  **49,863 B** |
| **ApplyPatch** |       **CopyObject_1** |     **875.0 ns** |    **25.59 ns** |    **13.38 ns** | **0.0269** |     **-** |     **-** |   **1,328 B** |
| **ApplyPatch** |      **CopyObject_16** |   **1,389.9 ns** |    **32.21 ns** |    **16.85 ns** | **0.0413** |     **-** |     **-** |   **1,560 B** |
| **ApplyPatch** |     **CopyObject_256** |   **7,931.7 ns** |   **118.24 ns** |    **61.84 ns** | **0.0827** |     **-** |     **-** |   **5,016 B** |
| **ApplyPatch** |    **CopyObject_4096** | **113,691.7 ns** | **1,368.62 ns** |   **715.81 ns** | **1.1161** |     **-** |     **-** |  **58,878 B** |
| **ApplyPatch** |      **JsonElement_1** |     **460.5 ns** |    **24.60 ns** |    **12.86 ns** | **0.0189** |     **-** |     **-** |     **840 B** |
| **ApplyPatch** |     **JsonElement_16** |     **815.3 ns** |    **12.79 ns** |     **6.69 ns** | **0.0251** |     **-** |     **-** |   **1,072 B** |
| **ApplyPatch** |    **JsonElement_256** |   **5,798.1 ns** |    **52.87 ns** |    **27.65 ns** | **0.1162** |     **-** |     **-** |   **4,528 B** |
| **ApplyPatch** |   **JsonElement_4096** |  **86,360.9 ns** | **1,839.42 ns** |   **962.05 ns** | **0.8562** |     **-** |     **-** |  **58,389 B** |
