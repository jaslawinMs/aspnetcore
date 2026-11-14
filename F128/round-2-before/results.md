``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.55802), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|         Method |                 Case |        Mean |      Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------- |--------------------- |------------:|-----------:|----------:|-------:|------:|------:|----------:|
| **AdaptedRequest** |   **Feature_NotRequest** |    **70.18 ns** |   **9.784 ns** |  **5.117 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |              **Missing** |    **78.61 ns** |   **1.650 ns** |  **0.863 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |   **Pipeline_NoUpgrade** |   **789.95 ns** | **129.770 ns** | **67.872 ns** | **0.0297** |     **-** |     **-** |   **1,344 B** |
| **AdaptedRequest** |     **Pipeline_Upgrade** | **1,772.41 ns** |  **75.614 ns** | **39.548 ns** | **0.0864** |     **-** |     **-** |   **3,232 B** |
| **AdaptedRequest** |       **StandardAccept** |    **51.70 ns** |   **0.796 ns** |  **0.416 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** | **Typed(...)us200 [24]** |   **179.64 ns** |   **3.695 ns** |  **1.933 ns** | **0.0072** |     **-** |     **-** |     **288 B** |
| **AdaptedRequest** |     **Typed_Dictionary** |   **113.84 ns** |   **1.675 ns** |  **0.876 ns** | **0.0033** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |        **Typed_Dynamic** |   **189.30 ns** |   **8.258 ns** |  **4.319 ns** | **0.0056** |     **-** |     **-** |     **208 B** |
| **AdaptedRequest** | **Typed(...)lback [26]** |   **114.78 ns** |   **2.953 ns** |  **1.545 ns** | **0.0034** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |  **Upgrade_OwinOptions** |   **792.14 ns** |  **28.719 ns** | **15.020 ns** | **0.0477** |     **-** |     **-** |   **2,064 B** |
| **AdaptedRequest** |          **WrongObject** |    **53.71 ns** |   **0.867 ns** |  **0.454 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
