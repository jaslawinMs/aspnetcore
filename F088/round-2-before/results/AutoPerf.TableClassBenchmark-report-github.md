``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                      Method |           Case |         Mean |        Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------------- |--------------- |-------------:|-------------:|------------:|-------:|------:|------:|----------:|
|         **PreparedRenderBlock** |      **Center2x3** |   **1,148.0 ns** |    **137.98 ns** |    **72.17 ns** | **0.0320** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |      Center2x3 |  45,417.3 ns | 12,172.84 ns | 6,366.63 ns |      - |     - |     - |  32,476 B |
| CustomProviderComponentHtml |      Center2x3 |  17,341.4 ns |  1,112.58 ns |   581.90 ns | 0.5081 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |        **Left2x3** |   **1,165.2 ns** |     **76.17 ns** |    **39.84 ns** | **0.0322** |     **-** |     **-** |   **1,384 B** |
|       ProviderComponentHtml |        Left2x3 |  34,133.8 ns |  1,114.21 ns |   582.76 ns | 0.6757 |     - |     - |  31,740 B |
| CustomProviderComponentHtml |        Left2x3 |  17,285.1 ns |  1,463.01 ns |   765.18 ns | 0.5027 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |     **Missing8x3** |   **1,829.1 ns** |    **144.20 ns** |    **75.42 ns** | **0.0353** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |     Missing8x3 |  49,451.0 ns |    715.67 ns |   374.31 ns | 0.5040 |     - |     - |  32,485 B |
| CustomProviderComponentHtml |     Missing8x3 |  17,210.9 ns |    723.91 ns |   378.62 ns | 0.3388 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |      **Mixed32x8** |  **35,902.5 ns** |  **2,134.49 ns** | **1,116.38 ns** | **1.0838** |     **-** |     **-** |  **50,379 B** |
|       ProviderComponentHtml |      Mixed32x8 | 450,597.3 ns |  5,939.85 ns | 3,106.66 ns | 8.9286 |     - |     - | 434,221 B |
| CustomProviderComponentHtml |      Mixed32x8 |  17,140.8 ns |    838.55 ns |   438.58 ns | 0.3378 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |       **Mixed8x3** |   **3,701.5 ns** |     **53.59 ns** |    **28.03 ns** | **0.1108** |     **-** |     **-** |   **5,128 B** |
|       ProviderComponentHtml |       Mixed8x3 |  65,700.2 ns |  5,761.35 ns | 3,013.30 ns | 1.2755 |     - |     - |  62,209 B |
| CustomProviderComponentHtml |       Mixed8x3 |  17,244.7 ns |    386.18 ns |   201.98 ns | 0.5054 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |    **Negative8x3** |   **3,610.9 ns** |     **56.99 ns** |    **29.81 ns** | **0.1074** |     **-** |     **-** |   **4,936 B** |
|       ProviderComponentHtml |    Negative8x3 |  65,170.5 ns |  3,885.86 ns | 2,032.38 ns | 1.2500 |     - |     - |  60,721 B |
| CustomProviderComponentHtml |    Negative8x3 |  17,058.1 ns |    358.18 ns |   187.33 ns | 0.5000 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |        **None8x3** |   **1,750.2 ns** |     **22.67 ns** |    **11.86 ns** | **0.0347** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |        None8x3 |  50,067.7 ns |    930.96 ns |   486.91 ns | 0.4960 |     - |     - |  32,485 B |
| CustomProviderComponentHtml |        None8x3 |  17,198.3 ns |    559.93 ns |   292.85 ns | 0.4987 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** | **PlainParagraph** |     **178.9 ns** |      **2.61 ns** |     **1.36 ns** | **0.0018** |     **-** |     **-** |     **128 B** |
|       ProviderComponentHtml | PlainParagraph |  20,916.6 ns |    288.92 ns |   151.11 ns | 0.4181 |     - |     - |  22,579 B |
| CustomProviderComponentHtml | PlainParagraph |  17,520.0 ns |    656.32 ns |   343.27 ns | 0.5165 |     - |     - |  19,274 B |
|         **PreparedRenderBlock** |    **Positive8x3** |   **3,204.3 ns** |    **135.22 ns** |    **70.72 ns** | **0.0968** |     **-** |     **-** |   **4,168 B** |
|       ProviderComponentHtml |    Positive8x3 |  62,496.8 ns |  4,390.54 ns | 2,296.34 ns | 1.2136 |     - |     - |  55,345 B |
| CustomProviderComponentHtml |    Positive8x3 |  16,962.6 ns |    155.81 ns |    81.49 ns | 0.5054 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |       **Right2x3** |   **1,089.0 ns** |     **21.62 ns** |    **11.31 ns** | **0.0323** |     **-** |     **-** |   **1,432 B** |
|       ProviderComponentHtml |       Right2x3 |  33,669.6 ns |    903.52 ns |   472.56 ns | 0.6831 |     - |     - |  32,085 B |
| CustomProviderComponentHtml |       Right2x3 |  17,093.8 ns |    399.38 ns |   208.88 ns | 0.3378 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** | **SparseMixed8x7** |   **6,671.1 ns** |    **153.54 ns** |    **80.30 ns** | **0.1957** |     **-** |     **-** |   **8,457 B** |
|       ProviderComponentHtml | SparseMixed8x7 | 102,326.9 ns |  1,907.79 ns |   997.81 ns | 2.0161 |     - |     - |  91,790 B |
| CustomProviderComponentHtml | SparseMixed8x7 |  16,933.6 ns |    333.97 ns |   174.67 ns | 0.5081 |     - |     - |  18,835 B |
