``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|        Method |               Recipe |      Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------- |--------------------- |----------:|----------:|---------:|-------:|------:|------:|----------:|
| **SelectOptions** | **Certi(...)or512 [22]** | **231.35 ns** | **16.048 ns** | **8.394 ns** | **0.0090** |     **-** |     **-** |     **576 B** |
| **SelectOptions** |        **Empty_Control** |  **27.46 ns** |  **0.492 ns** | **0.257 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Exact1_Control** |  **34.29 ns** |  **0.549 ns** | **0.287 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Exact512_Control** |  **34.31 ns** |  **1.080 ns** | **0.565 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |         **Null_Control** |  **27.50 ns** |  **1.119 ns** | **0.585 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **OnAuthenticate512** | **128.49 ns** |  **3.653 ns** | **1.911 ns** | **0.0039** |     **-** |     **-** |     **184 B** |
| **SelectOptions** |             **Overlap2** |  **84.45 ns** |  **4.641 ns** | **2.427 ns** | **0.0017** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |            **Overlap64** |  **56.33 ns** |  **0.498 ns** | **0.261 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **Patterns1_Deep_Last** | **244.41 ns** |  **2.744 ns** | **1.435 ns** |      **-** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |      **Patterns1_First** |  **83.12 ns** |  **1.929 ns** | **1.009 ns** | **0.0017** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |       **Patterns1_Last** |  **83.90 ns** |  **1.793 ns** | **0.938 ns** | **0.0018** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |       **Patterns1_Miss** |  **92.76 ns** |  **4.578 ns** | **2.395 ns** | **0.0019** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |  **Patterns2_Deep_Last** | **264.84 ns** |  **8.458 ns** | **4.424 ns** |      **-** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |      **Patterns2_First** |  **83.58 ns** |  **2.248 ns** | **1.176 ns** | **0.0017** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |       **Patterns2_Last** | **103.15 ns** |  **1.576 ns** | **0.824 ns** | **0.0021** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |       **Patterns2_Miss** | **107.03 ns** |  **2.165 ns** | **1.132 ns** | **0.0011** |     **-** |     **-** |      **80 B** |
| **SelectOptions** | **Patte(...)_Miss [21]** | **824.30 ns** |  **6.648 ns** | **3.477 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **Patterns512_First** |  **55.90 ns** |  **0.770 ns** | **0.403 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns512_Last** |  **80.99 ns** |  **0.842 ns** | **0.440 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns512_Miss** | **107.17 ns** |  **1.217 ns** | **0.637 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns64_First** |  **56.33 ns** |  **1.620 ns** | **0.848 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns64_Last** |  **77.97 ns** |  **2.032 ns** | **1.063 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns64_Miss** | **105.18 ns** |  **1.376 ns** | **0.720 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns8_First** |  **84.96 ns** |  **1.564 ns** | **0.818 ns** | **0.0018** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |       **Patterns8_Last** | **198.42 ns** |  **3.631 ns** | **1.899 ns** | **0.0020** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |       **Patterns8_Miss** | **209.81 ns** |  **2.742 ns** | **1.434 ns** | **0.0021** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |    **RawALabelDistinct** | **106.57 ns** |  **2.011 ns** | **1.052 ns** | **0.0011** |     **-** |     **-** |      **80 B** |
| **SelectOptions** |  **TrailingDot_Control** |  **27.89 ns** |  **0.360 ns** | **0.188 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |        **UnicodeSuffix** | **154.04 ns** |  **1.255 ns** | **0.656 ns** | **0.0016** |     **-** |     **-** |      **80 B** |
