``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|        Method |               Recipe |        Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------- |--------------------- |------------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **SelectOptions** | **Certi(...)or512 [22]** | **2,240.30 ns** | **276.645 ns** | **144.691 ns** |      **-** |     **-** |     **-** |     **578 B** |
| **SelectOptions** |        **Empty_Control** |    **25.49 ns** |   **0.609 ns** |   **0.318 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Exact1_Control** |    **31.44 ns** |   **0.855 ns** |   **0.447 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Exact512_Control** |    **31.78 ns** |   **1.923 ns** |   **1.006 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |         **Null_Control** |    **25.40 ns** |   **0.552 ns** |   **0.289 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **OnAuthenticate512** | **2,103.18 ns** |  **62.626 ns** |  **32.754 ns** |      **-** |     **-** |     **-** |     **184 B** |
| **SelectOptions** |             **Overlap2** |    **53.88 ns** |   **1.257 ns** |   **0.657 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |            **Overlap64** |    **53.57 ns** |   **1.060 ns** |   **0.554 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **Patterns1_Deep_Last** |   **223.49 ns** |   **2.335 ns** |   **1.221 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns1_First** |    **53.50 ns** |   **1.051 ns** |   **0.549 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns1_Last** |    **53.55 ns** |   **0.776 ns** |   **0.406 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns1_Miss** |    **57.85 ns** |   **1.255 ns** |   **0.656 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **Patterns2_Deep_Last** |   **231.22 ns** |   **2.831 ns** |   **1.481 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns2_First** |    **53.91 ns** |   **1.235 ns** |   **0.646 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns2_Last** |    **60.92 ns** |   **1.353 ns** |   **0.708 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns2_Miss** |    **61.93 ns** |   **0.608 ns** |   **0.318 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** | **Patte(...)_Miss [21]** | **2,340.98 ns** |  **37.957 ns** |  **19.852 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **Patterns512_First** |    **53.39 ns** |   **1.081 ns** |   **0.565 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns512_Last** | **2,039.73 ns** |  **24.399 ns** |  **12.761 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns512_Miss** | **2,237.74 ns** |  **44.468 ns** |  **23.258 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns64_First** |    **53.97 ns** |   **1.324 ns** |   **0.693 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns64_Last** |   **297.81 ns** |   **3.679 ns** |   **1.924 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns64_Miss** |   **334.11 ns** |   **5.578 ns** |   **2.917 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns8_First** |    **53.52 ns** |   **1.080 ns** |   **0.565 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns8_Last** |    **80.99 ns** |   **0.805 ns** |   **0.421 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns8_Miss** |    **88.43 ns** |   **1.254 ns** |   **0.656 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **RawALabelDistinct** |    **62.78 ns** |   **1.265 ns** |   **0.662 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **TrailingDot_Control** |    **27.15 ns** |   **2.387 ns** |   **1.248 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |        **UnicodeSuffix** |   **121.84 ns** |   **2.602 ns** |   **1.361 ns** |      **-** |     **-** |     **-** |      **24 B** |
