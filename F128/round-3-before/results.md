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
| **AdaptedRequest** |   **Feature_NotRequest** |    **68.67 ns** |  **1.215 ns** |  **0.635 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |              **Missing** |    **78.05 ns** |  **1.147 ns** |  **0.600 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |   **Pipeline_NoUpgrade** |   **770.79 ns** | **21.088 ns** | **11.029 ns** | **0.0312** |     **-** |     **-** |   **1,344 B** |
| **AdaptedRequest** |     **Pipeline_Upgrade** | **1,596.53 ns** | **47.000 ns** | **24.582 ns** | **0.0802** |     **-** |     **-** |   **3,232 B** |
| **AdaptedRequest** |       **StandardAccept** |    **53.13 ns** |  **2.423 ns** |  **1.267 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** | **Typed(...)us200 [24]** |   **198.45 ns** | **71.955 ns** | **37.634 ns** | **0.0070** |     **-** |     **-** |     **288 B** |
| **AdaptedRequest** |     **Typed_Dictionary** |   **109.45 ns** |  **3.032 ns** |  **1.586 ns** | **0.0034** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |        **Typed_Dynamic** |   **202.37 ns** | **11.056 ns** |  **5.783 ns** | **0.0040** |     **-** |     **-** |     **208 B** |
| **AdaptedRequest** | **Typed(...)lback [26]** |   **112.26 ns** |  **4.196 ns** |  **2.194 ns** | **0.0034** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |  **Upgrade_OwinOptions** |   **815.33 ns** | **40.611 ns** | **21.240 ns** | **0.0488** |     **-** |     **-** |   **2,064 B** |
| **AdaptedRequest** |          **WrongObject** |    **49.85 ns** |  **0.615 ns** |  **0.322 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
