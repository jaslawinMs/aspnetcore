``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.55802), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|         Method |                 Case |        Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------- |--------------------- |------------:|----------:|----------:|-------:|------:|------:|----------:|
| **AdaptedRequest** |   **Feature_NotRequest** |    **67.90 ns** |  **1.465 ns** |  **0.766 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |              **Missing** |    **82.90 ns** |  **1.087 ns** |  **0.569 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |   **Pipeline_NoUpgrade** |   **749.35 ns** | **38.526 ns** | **20.150 ns** | **0.0301** |     **-** |     **-** |   **1,344 B** |
| **AdaptedRequest** |     **Pipeline_Upgrade** | **1,807.63 ns** | **64.149 ns** | **33.551 ns** | **0.0694** |     **-** |     **-** |   **3,232 B** |
| **AdaptedRequest** |       **StandardAccept** |    **49.48 ns** |  **1.036 ns** |  **0.542 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** | **Typed(...)us200 [24]** |   **184.00 ns** |  **9.194 ns** |  **4.809 ns** | **0.0074** |     **-** |     **-** |     **288 B** |
| **AdaptedRequest** |     **Typed_Dictionary** |   **111.79 ns** |  **2.407 ns** |  **1.259 ns** | **0.0034** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |        **Typed_Dynamic** |   **201.55 ns** |  **3.230 ns** |  **1.689 ns** | **0.0041** |     **-** |     **-** |     **208 B** |
| **AdaptedRequest** | **Typed(...)lback [26]** |   **110.61 ns** |  **2.615 ns** |  **1.367 ns** | **0.0034** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |  **Upgrade_OwinOptions** |   **876.34 ns** | **67.498 ns** | **35.303 ns** | **0.0514** |     **-** |     **-** |   **2,064 B** |
| **AdaptedRequest** |          **WrongObject** |    **49.58 ns** |  **1.111 ns** |  **0.581 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
