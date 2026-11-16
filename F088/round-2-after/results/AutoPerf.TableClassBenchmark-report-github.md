``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                      Method |           Case |         Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------------- |--------------- |-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
|         **PreparedRenderBlock** |      **Center2x3** |     **670.0 ns** |     **14.58 ns** |      **7.62 ns** | **0.0135** |     **-** |     **-** |     **520 B** |
|       ProviderComponentHtml |      Center2x3 |  48,948.7 ns | 23,798.34 ns | 12,446.99 ns |      - |     - |     - |  25,778 B |
| CustomProviderComponentHtml |      Center2x3 |  16,918.7 ns |    619.18 ns |    323.84 ns | 0.3378 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |        **Left2x3** |     **688.8 ns** |     **63.04 ns** |     **32.97 ns** | **0.0132** |     **-** |     **-** |     **520 B** |
|       ProviderComponentHtml |        Left2x3 |  30,787.9 ns |  1,763.87 ns |    922.54 ns | 0.6039 |     - |     - |  25,692 B |
| CustomProviderComponentHtml |        Left2x3 |  17,510.9 ns |    996.03 ns |    520.94 ns | 0.3388 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |     **Missing8x3** |   **2,011.4 ns** |     **51.44 ns** |     **26.90 ns** | **0.0202** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |     Missing8x3 |  51,897.7 ns |  1,728.86 ns |    904.23 ns | 0.5000 |     - |     - |  32,485 B |
| CustomProviderComponentHtml |     Missing8x3 |  17,015.9 ns |    206.04 ns |    107.76 ns | 0.5054 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |      **Mixed32x8** |  **20,550.4 ns** |  **1,093.84 ns** |    **572.10 ns** | **0.1990** |     **-** |     **-** |  **11,721 B** |
|       ProviderComponentHtml |      Mixed32x8 | 307,208.7 ns |  6,316.63 ns |  3,303.72 ns | 2.9762 |     - |     - | 163,600 B |
| CustomProviderComponentHtml |      Mixed32x8 |  17,166.0 ns |    538.72 ns |    281.76 ns | 0.3463 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |       **Mixed8x3** |   **2,183.1 ns** |     **95.00 ns** |     **49.69 ns** | **0.0213** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |       Mixed8x3 |  55,443.9 ns |  3,090.22 ns |  1,616.25 ns | 0.5342 |     - |     - |  36,670 B |
| CustomProviderComponentHtml |       Mixed8x3 |  17,733.6 ns |  1,258.31 ns |    658.12 ns | 0.5000 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |    **Negative8x3** |   **3,545.1 ns** |    **114.95 ns** |     **60.12 ns** | **0.1073** |     **-** |     **-** |   **4,936 B** |
|       ProviderComponentHtml |    Negative8x3 |  64,355.0 ns |  2,127.21 ns |  1,112.57 ns | 1.2626 |     - |     - |  60,721 B |
| CustomProviderComponentHtml |    Negative8x3 |  17,375.2 ns |  2,026.48 ns |  1,059.89 ns | 0.5054 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |        **None8x3** |   **1,715.0 ns** |     **12.85 ns** |      **6.72 ns** | **0.0347** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |        None8x3 |  50,485.7 ns |  1,197.54 ns |    626.34 ns | 0.5123 |     - |     - |  32,485 B |
| CustomProviderComponentHtml |        None8x3 |  17,007.0 ns |    227.59 ns |    119.03 ns | 0.4947 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** | **PlainParagraph** |     **169.6 ns** |      **2.90 ns** |      **1.51 ns** | **0.0034** |     **-** |     **-** |     **128 B** |
|       ProviderComponentHtml | PlainParagraph |  20,620.8 ns |    321.50 ns |    168.15 ns | 0.4098 |     - |     - |  22,578 B |
| CustomProviderComponentHtml | PlainParagraph |  17,319.6 ns |    255.22 ns |    133.49 ns | 0.5137 |     - |     - |  19,274 B |
|         **PreparedRenderBlock** |    **Positive8x3** |   **3,624.9 ns** |    **275.50 ns** |    **144.09 ns** | **0.0973** |     **-** |     **-** |   **4,168 B** |
|       ProviderComponentHtml |    Positive8x3 |  62,589.5 ns |  4,070.27 ns |  2,128.83 ns | 1.2376 |     - |     - |  55,345 B |
| CustomProviderComponentHtml |    Positive8x3 |  17,472.6 ns |  1,373.60 ns |    718.42 ns | 0.3531 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |       **Right2x3** |     **666.3 ns** |      **9.70 ns** |      **5.08 ns** | **0.0134** |     **-** |     **-** |     **520 B** |
|       ProviderComponentHtml |       Right2x3 |  31,854.0 ns |  1,901.28 ns |    994.41 ns | 0.6010 |     - |     - |  25,700 B |
| CustomProviderComponentHtml |       Right2x3 |  17,058.1 ns |    593.72 ns |    310.52 ns | 0.5054 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** | **SparseMixed8x7** |   **5,479.5 ns** |    **170.84 ns** |     **89.35 ns** | **0.1050** |     **-** |     **-** |   **4,808 B** |
|       ProviderComponentHtml | SparseMixed8x7 |  92,906.4 ns |  1,662.36 ns |    869.45 ns | 0.9191 |     - |     - |  66,251 B |
| CustomProviderComponentHtml | SparseMixed8x7 |  17,536.2 ns |  1,418.80 ns |    742.06 ns | 0.5068 |     - |     - |  18,835 B |
