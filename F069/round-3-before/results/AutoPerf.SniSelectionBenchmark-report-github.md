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
| **SelectOptions** | **Certi(...)or512 [22]** | **2,214.25 ns** | **201.908 ns** | **105.602 ns** |      **-** |     **-** |     **-** |     **578 B** |
| **SelectOptions** |        **Empty_Control** |    **26.24 ns** |   **0.387 ns** |   **0.202 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Exact1_Control** |    **33.48 ns** |   **0.708 ns** |   **0.370 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Exact512_Control** |    **32.87 ns** |   **0.427 ns** |   **0.223 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |         **Null_Control** |    **26.44 ns** |   **0.613 ns** |   **0.320 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **OnAuthenticate512** | **2,062.62 ns** |  **25.552 ns** |  **13.364 ns** |      **-** |     **-** |     **-** |     **184 B** |
| **SelectOptions** |             **Overlap2** |    **56.81 ns** |  **11.485 ns** |   **6.007 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |            **Overlap64** |    **55.21 ns** |   **0.542 ns** |   **0.283 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **Patterns1_Deep_Last** |   **224.03 ns** |   **3.117 ns** |   **1.630 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns1_First** |    **54.42 ns** |   **1.058 ns** |   **0.553 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns1_Last** |    **54.36 ns** |   **0.519 ns** |   **0.271 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns1_Miss** |    **58.60 ns** |   **0.852 ns** |   **0.446 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **Patterns2_Deep_Last** |   **230.37 ns** |   **0.930 ns** |   **0.486 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns2_First** |    **55.10 ns** |   **2.297 ns** |   **1.201 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns2_Last** |    **61.98 ns** |   **0.541 ns** |   **0.283 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns2_Miss** |    **62.40 ns** |   **1.181 ns** |   **0.618 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** | **Patte(...)_Miss [21]** | **2,428.37 ns** |  **66.032 ns** |  **34.536 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **Patterns512_First** |    **54.88 ns** |   **0.935 ns** |   **0.489 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns512_Last** | **2,022.06 ns** |  **40.363 ns** |  **21.111 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns512_Miss** | **2,297.46 ns** |  **38.047 ns** |  **19.899 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |     **Patterns64_First** |    **54.55 ns** |   **1.240 ns** |   **0.649 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns64_Last** |   **289.31 ns** |   **3.511 ns** |   **1.836 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns64_Miss** |   **344.55 ns** |  **17.498 ns** |   **9.152 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |      **Patterns8_First** |    **54.83 ns** |   **1.070 ns** |   **0.559 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns8_Last** |    **86.19 ns** |   **1.456 ns** |   **0.762 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |       **Patterns8_Miss** |    **89.84 ns** |   **1.608 ns** |   **0.841 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |    **RawALabelDistinct** |    **64.58 ns** |   **1.415 ns** |   **0.740 ns** |      **-** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |  **TrailingDot_Control** |    **27.28 ns** |   **1.005 ns** |   **0.526 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **SelectOptions** |        **UnicodeSuffix** |   **126.00 ns** |   **2.544 ns** |   **1.331 ns** |      **-** |     **-** |     **-** |      **24 B** |
