``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|        Method |               Recipe |      Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------- |--------------------- |----------:|----------:|----------:|-------:|------:|------:|----------:|
| **SelectOptions** | **Certi(...)or512 [22]** | **223.45 ns** | **20.354 ns** | **10.646 ns** | **0.0149** |     **-** |     **-** |     **576 B** |
| **SelectOptions** |        **Empty_Control** |  **27.83 ns** |  **0.672 ns** |  **0.351 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Exact1_Control** |  **34.27 ns** |  **1.030 ns** |  **0.538 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Exact512_Control** |  **34.34 ns** |  **1.372 ns** |  **0.718 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |         **Null_Control** |  **27.89 ns** |  **0.387 ns** |  **0.202 ns** | **0.0003** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **OnAuthenticate512** | **122.48 ns** |  **4.177 ns** |  **2.185 ns** | **0.0038** |     **-** |     **-** |     **184 B** |
| **SelectOptions** |             **Overlap2** |  **74.38 ns** |  **1.995 ns** |  **1.044 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |            **Overlap64** |  **78.42 ns** |  **1.360 ns** |  **0.711 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **Patterns1_Deep_Last** | **791.55 ns** | **11.273 ns** |  **5.896 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns1_First** |  **76.18 ns** |  **2.354 ns** |  **1.231 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns1_Last** |  **80.62 ns** |  **0.885 ns** |  **0.463 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns1_Miss** | **103.33 ns** |  **1.660 ns** |  **0.868 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **Patterns2_Deep_Last** | **798.69 ns** | **12.298 ns** |  **6.432 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns2_First** |  **77.04 ns** |  **0.596 ns** |  **0.312 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns2_Last** |  **77.25 ns** |  **1.927 ns** |  **1.008 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns2_Miss** | **107.28 ns** |  **2.501 ns** |  **1.308 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** | **Patte(...)_Miss [21]** | **832.54 ns** |  **6.172 ns** |  **3.228 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **Patterns512_First** |  **75.00 ns** |  **1.402 ns** |  **0.734 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns512_Last** |  **76.19 ns** |  **1.569 ns** |  **0.821 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns512_Miss** | **102.92 ns** |  **1.049 ns** |  **0.549 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns64_First** |  **81.52 ns** |  **1.562 ns** |  **0.817 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns64_Last** |  **80.37 ns** |  **1.250 ns** |  **0.654 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns64_Miss** | **102.22 ns** |  **2.124 ns** |  **1.111 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns8_First** |  **84.61 ns** |  **0.928 ns** |  **0.485 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns8_Last** |  **78.39 ns** |  **1.328 ns** |  **0.694 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns8_Miss** | **103.86 ns** |  **1.723 ns** |  **0.901 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **RawALabelDistinct** | **109.21 ns** |  **3.117 ns** |  **1.630 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **TrailingDot_Control** |  **27.87 ns** |  **0.826 ns** |  **0.432 ns** | **0.0003** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |        **UnicodeSuffix** | **161.97 ns** |  **2.772 ns** |  **1.450 ns** |      **-** |     **-** |     **-** |      **24 B** |
