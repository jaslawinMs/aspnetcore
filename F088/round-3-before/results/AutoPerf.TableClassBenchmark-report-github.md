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
|         **PreparedRenderBlock** |      **Center2x3** |   **1,080.4 ns** |     **35.23 ns** |     **18.42 ns** | **0.0316** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |      Center2x3 |  63,221.2 ns | 20,488.28 ns | 10,715.77 ns |      - |     - |     - |  32,579 B |
| CustomProviderComponentHtml |      Center2x3 |  17,212.0 ns |    391.86 ns |    204.95 ns | 0.5027 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |        **Left2x3** |   **1,044.6 ns** |     **27.10 ns** |     **14.18 ns** | **0.0331** |     **-** |     **-** |   **1,384 B** |
|       ProviderComponentHtml |        Left2x3 |  34,442.0 ns |  1,769.91 ns |    925.70 ns | 0.6614 |     - |     - |  31,740 B |
| CustomProviderComponentHtml |        Left2x3 |  16,835.1 ns |    245.98 ns |    128.65 ns | 0.3406 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |     **Missing8x3** |   **1,776.2 ns** |     **34.33 ns** |     **17.96 ns** | **0.0357** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |     Missing8x3 |  50,258.2 ns |  1,218.04 ns |    637.06 ns | 0.5000 |     - |     - |  32,485 B |
| CustomProviderComponentHtml |     Missing8x3 |  17,226.9 ns |    545.95 ns |    285.54 ns | 0.3406 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |      **Mixed32x8** |  **36,050.2 ns** |  **4,085.60 ns** |  **2,136.85 ns** | **1.0593** |     **-** |     **-** |  **50,379 B** |
|       ProviderComponentHtml |      Mixed32x8 | 434,972.9 ns | 13,533.80 ns |  7,078.44 ns | 8.3333 |     - |     - | 434,218 B |
| CustomProviderComponentHtml |      Mixed32x8 |  17,244.4 ns |    554.68 ns |    290.11 ns | 0.5054 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |       **Mixed8x3** |   **3,668.4 ns** |    **144.77 ns** |     **75.72 ns** | **0.1068** |     **-** |     **-** |   **5,128 B** |
|       ProviderComponentHtml |       Mixed8x3 |  66,534.8 ns |  1,285.23 ns |    672.20 ns | 1.2887 |     - |     - |  62,209 B |
| CustomProviderComponentHtml |       Mixed8x3 |  17,045.4 ns |    336.52 ns |    176.00 ns | 0.3425 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |    **Negative8x3** |   **3,475.3 ns** |     **50.54 ns** |     **26.43 ns** | **0.1045** |     **-** |     **-** |   **4,936 B** |
|       ProviderComponentHtml |    Negative8x3 |  64,164.4 ns |  1,188.96 ns |    621.85 ns | 1.2887 |     - |     - |  60,721 B |
| CustomProviderComponentHtml |    Negative8x3 |  16,991.7 ns |    465.69 ns |    243.56 ns | 0.3415 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |        **None8x3** |   **1,809.4 ns** |     **20.32 ns** |     **10.63 ns** | **0.0385** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |        None8x3 |  51,393.5 ns |    895.92 ns |    468.59 ns | 0.4960 |     - |     - |  32,485 B |
| CustomProviderComponentHtml |        None8x3 |  17,105.6 ns |    496.83 ns |    259.85 ns | 0.3444 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** | **PlainParagraph** |     **183.8 ns** |     **10.59 ns** |      **5.54 ns** | **0.0018** |     **-** |     **-** |     **128 B** |
|       ProviderComponentHtml | PlainParagraph |  20,790.7 ns |    416.54 ns |    217.86 ns | 0.4125 |     - |     - |  22,578 B |
| CustomProviderComponentHtml | PlainParagraph |  17,260.1 ns |    244.94 ns |    128.11 ns | 0.5123 |     - |     - |  19,274 B |
|         **PreparedRenderBlock** |    **Positive8x3** |   **3,453.2 ns** |    **178.43 ns** |     **93.32 ns** | **0.1061** |     **-** |     **-** |   **4,168 B** |
|       ProviderComponentHtml |    Positive8x3 |  62,266.0 ns |  1,644.34 ns |    860.02 ns | 1.2887 |     - |     - |  55,345 B |
| CustomProviderComponentHtml |    Positive8x3 |  17,167.8 ns |    457.91 ns |    239.50 ns | 0.4987 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |       **Right2x3** |   **1,061.1 ns** |     **17.95 ns** |      **9.39 ns** | **0.0316** |     **-** |     **-** |   **1,432 B** |
|       ProviderComponentHtml |       Right2x3 |  33,840.1 ns |  1,025.10 ns |    536.15 ns | 0.6720 |     - |     - |  32,085 B |
| CustomProviderComponentHtml |       Right2x3 |  17,071.2 ns |    652.78 ns |    341.42 ns | 0.5013 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** | **SparseMixed8x7** |   **6,457.0 ns** |     **98.31 ns** |     **51.42 ns** | **0.1939** |     **-** |     **-** |   **8,457 B** |
|       ProviderComponentHtml | SparseMixed8x7 | 106,309.8 ns |  7,451.91 ns |  3,897.49 ns | 2.0161 |     - |     - |  91,790 B |
| CustomProviderComponentHtml | SparseMixed8x7 |  17,097.5 ns |    306.77 ns |    160.45 ns | 0.3369 |     - |     - |  18,834 B |
