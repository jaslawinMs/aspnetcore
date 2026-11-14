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
| **AdaptedRequest** |   **Feature_NotRequest** |    **70.91 ns** |  **4.366 ns** |  **2.283 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |              **Missing** |    **82.25 ns** |  **1.975 ns** |  **1.033 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |   **Pipeline_NoUpgrade** |   **766.66 ns** | **36.662 ns** | **19.175 ns** | **0.0298** |     **-** |     **-** |   **1,344 B** |
| **AdaptedRequest** |     **Pipeline_Upgrade** | **1,588.17 ns** | **43.652 ns** | **22.831 ns** | **0.0781** |     **-** |     **-** |   **3,232 B** |
| **AdaptedRequest** |       **StandardAccept** |    **55.85 ns** |  **1.425 ns** |  **0.745 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** | **Typed(...)us200 [24]** |   **178.11 ns** | **11.674 ns** |  **6.106 ns** | **0.0073** |     **-** |     **-** |     **288 B** |
| **AdaptedRequest** |     **Typed_Dictionary** |   **111.46 ns** |  **3.573 ns** |  **1.869 ns** | **0.0034** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |        **Typed_Dynamic** |   **193.07 ns** |  **3.821 ns** |  **1.999 ns** | **0.0038** |     **-** |     **-** |     **208 B** |
| **AdaptedRequest** | **Typed(...)lback [26]** |   **109.36 ns** |  **3.560 ns** |  **1.862 ns** | **0.0033** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |  **Upgrade_OwinOptions** |   **797.84 ns** | **22.046 ns** | **11.530 ns** | **0.0477** |     **-** |     **-** |   **2,064 B** |
| **AdaptedRequest** |          **WrongObject** |    **52.61 ns** |  **1.547 ns** |  **0.809 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
