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
| **SelectOptions** | **Certi(...)or512 [22]** | **217.87 ns** | **42.941 ns** | **22.459 ns** | **0.0084** |     **-** |     **-** |     **576 B** |
| **SelectOptions** |        **Empty_Control** |  **24.41 ns** |  **0.450 ns** |  **0.236 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Exact1_Control** |  **31.11 ns** |  **0.905 ns** |  **0.473 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Exact512_Control** |  **31.10 ns** |  **0.546 ns** |  **0.285 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |         **Null_Control** |  **23.97 ns** |  **0.488 ns** |  **0.255 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **OnAuthenticate512** | **123.79 ns** |  **3.124 ns** |  **1.634 ns** | **0.0038** |     **-** |     **-** |     **184 B** |
| **SelectOptions** |             **Overlap2** |  **57.18 ns** |  **5.762 ns** |  **3.014 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |            **Overlap64** |  **55.11 ns** |  **0.628 ns** |  **0.329 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **Patterns1_Deep_Last** | **225.08 ns** |  **2.100 ns** |  **1.098 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns1_First** |  **55.67 ns** |  **0.854 ns** |  **0.447 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns1_Last** |  **59.57 ns** |  **3.337 ns** |  **1.745 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns1_Miss** |  **58.89 ns** |  **0.802 ns** |  **0.419 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **Patterns2_Deep_Last** | **230.22 ns** |  **1.352 ns** |  **0.707 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns2_First** |  **56.11 ns** |  **1.944 ns** |  **1.017 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns2_Last** |  **62.22 ns** |  **1.215 ns** |  **0.635 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns2_Miss** |  **63.01 ns** |  **1.228 ns** |  **0.642 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** | **Patte(...)_Miss [21]** | **828.60 ns** |  **8.958 ns** |  **4.685 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **Patterns512_First** |  **55.52 ns** |  **1.173 ns** |  **0.613 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns512_Last** |  **78.99 ns** |  **1.022 ns** |  **0.534 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns512_Miss** | **108.66 ns** |  **2.217 ns** |  **1.160 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns64_First** |  **55.26 ns** |  **1.108 ns** |  **0.579 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns64_Last** |  **78.06 ns** |  **1.014 ns** |  **0.530 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns64_Miss** | **108.56 ns** |  **2.611 ns** |  **1.366 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns8_First** |  **56.59 ns** |  **2.800 ns** |  **1.464 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns8_Last** |  **92.57 ns** |  **0.836 ns** |  **0.437 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns8_Miss** |  **98.21 ns** |  **1.038 ns** |  **0.543 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **RawALabelDistinct** |  **63.63 ns** |  **1.503 ns** |  **0.786 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **TrailingDot_Control** |  **24.85 ns** |  **0.414 ns** |  **0.217 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |        **UnicodeSuffix** | **125.60 ns** |  **1.328 ns** |  **0.695 ns** |      **-** |     **-** |     **-** |      **24 B** |
