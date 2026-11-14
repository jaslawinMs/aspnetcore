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
| **AdaptedRequest** |   **Feature_NotRequest** |    **69.87 ns** |  **0.546 ns** |  **0.285 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |              **Missing** |    **80.18 ns** |  **1.157 ns** |  **0.605 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** |   **Pipeline_NoUpgrade** |   **809.17 ns** | **47.302 ns** | **24.740 ns** | **0.0311** |     **-** |     **-** |   **1,344 B** |
| **AdaptedRequest** |     **Pipeline_Upgrade** | **1,622.10 ns** | **65.533 ns** | **34.275 ns** | **0.0808** |     **-** |     **-** |   **3,232 B** |
| **AdaptedRequest** |       **StandardAccept** |    **52.12 ns** |  **0.784 ns** |  **0.410 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
| **AdaptedRequest** | **Typed(...)us200 [24]** |   **176.35 ns** |  **4.857 ns** |  **2.540 ns** | **0.0073** |     **-** |     **-** |     **288 B** |
| **AdaptedRequest** |     **Typed_Dictionary** |   **109.15 ns** |  **5.092 ns** |  **2.663 ns** | **0.0033** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |        **Typed_Dynamic** |   **198.90 ns** |  **5.650 ns** |  **2.955 ns** | **0.0040** |     **-** |     **-** |     **208 B** |
| **AdaptedRequest** | **Typed(...)lback [26]** |   **109.54 ns** |  **4.055 ns** |  **2.121 ns** | **0.0033** |     **-** |     **-** |     **128 B** |
| **AdaptedRequest** |  **Upgrade_OwinOptions** |   **796.56 ns** | **27.857 ns** | **14.570 ns** | **0.0534** |     **-** |     **-** |   **2,064 B** |
| **AdaptedRequest** |          **WrongObject** |    **49.54 ns** |  **0.566 ns** |  **0.296 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
