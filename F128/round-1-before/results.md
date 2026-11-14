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
| **AdaptedRequest** |   **Feature_NotRequest** |    **66.57 ns** |  **1.240 ns** |  **0.649 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |              **Missing** |    **75.72 ns** |  **1.288 ns** |  **0.674 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |   **Pipeline_NoUpgrade** |   **797.08 ns** | **72.341 ns** | **37.836 ns** | **0.0301** |     **-** |     **-** |   **1,344 B** |
| **AdaptedRequest** |     **Pipeline_Upgrade** | **1,590.30 ns** | **41.316 ns** | **21.609 ns** | **0.0788** |     **-** |     **-** |   **3,232 B** |
| **AdaptedRequest** |       **StandardAccept** |    **58.21 ns** |  **0.552 ns** |  **0.289 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** | **Typed(...)us200 [24]** |   **181.85 ns** | **10.010 ns** |  **5.235 ns** | **0.0074** |     **-** |     **-** |     **288 B** |
| **AdaptedRequest** |     **Typed_Dictionary** |   **114.48 ns** |  **5.441 ns** |  **2.846 ns** | **0.0023** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |        **Typed_Dynamic** |   **193.04 ns** |  **5.542 ns** |  **2.898 ns** | **0.0039** |     **-** |     **-** |     **208 B** |
| **AdaptedRequest** | **Typed(...)lback [26]** |   **114.23 ns** |  **5.429 ns** |  **2.840 ns** | **0.0023** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |  **Upgrade_OwinOptions** |   **818.73 ns** | **69.553 ns** | **36.378 ns** | **0.0546** |     **-** |     **-** |   **2,064 B** |
| **AdaptedRequest** |          **WrongObject** |    **52.07 ns** |  **0.836 ns** |  **0.437 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
