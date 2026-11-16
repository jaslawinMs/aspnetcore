``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                      Method |           Case |         Mean |        Error |       StdDev |       Median |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------------- |--------------- |-------------:|-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
|         **PreparedRenderBlock** |      **Center2x3** |     **676.9 ns** |     **40.49 ns** |     **21.18 ns** |     **674.3 ns** | **0.0133** |     **-** |     **-** |     **520 B** |
|       ProviderComponentHtml |      Center2x3 |  68,462.6 ns | 75,071.62 ns | 39,263.91 ns |  50,786.6 ns |      - |     - |     - |  25,776 B |
| CustomProviderComponentHtml |      Center2x3 |  17,171.9 ns |  1,172.46 ns |    613.22 ns |  17,002.4 ns | 0.3369 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |        **Left2x3** |     **717.1 ns** |     **53.70 ns** |     **28.08 ns** |     **706.2 ns** | **0.0136** |     **-** |     **-** |     **520 B** |
|       ProviderComponentHtml |        Left2x3 |  30,671.8 ns |  1,096.41 ns |    573.44 ns |  30,519.9 ns | 0.6127 |     - |     - |  25,692 B |
| CustomProviderComponentHtml |        Left2x3 |  17,367.8 ns |  1,504.24 ns |    786.75 ns |  17,070.7 ns | 0.3634 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |     **Missing8x3** |   **1,724.6 ns** |     **59.22 ns** |     **30.98 ns** |   **1,715.7 ns** | **0.0354** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |     Missing8x3 |  51,095.2 ns |  2,761.45 ns |  1,444.29 ns |  50,649.8 ns | 0.5165 |     - |     - |  32,486 B |
| CustomProviderComponentHtml |     Missing8x3 |  17,033.8 ns |    365.54 ns |    191.18 ns |  17,005.8 ns | 0.3397 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |      **Mixed32x8** |  **20,351.9 ns** |    **614.17 ns** |    **321.22 ns** |  **20,340.5 ns** | **0.2029** |     **-** |     **-** |  **11,721 B** |
|       ProviderComponentHtml |      Mixed32x8 | 324,527.5 ns | 17,622.15 ns |  9,216.72 ns | 329,031.9 ns | 3.1250 |     - |     - | 163,601 B |
| CustomProviderComponentHtml |      Mixed32x8 |  16,932.8 ns |    383.62 ns |    200.64 ns |  16,923.7 ns | 0.3397 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |       **Mixed8x3** |   **2,218.5 ns** |    **103.91 ns** |     **54.35 ns** |   **2,209.6 ns** | **0.0216** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |       Mixed8x3 |  54,386.7 ns |  1,964.88 ns |  1,027.67 ns |  54,247.4 ns | 0.5435 |     - |     - |  36,670 B |
| CustomProviderComponentHtml |       Mixed8x3 |  17,627.1 ns |  1,505.26 ns |    787.28 ns |  17,711.6 ns | 0.3388 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |    **Negative8x3** |   **3,849.9 ns** |    **671.78 ns** |    **351.36 ns** |   **3,790.3 ns** | **0.1036** |     **-** |     **-** |   **4,936 B** |
|       ProviderComponentHtml |    Negative8x3 |  63,801.9 ns |  1,835.69 ns |    960.10 ns |  63,813.5 ns | 1.3158 |     - |     - |  60,721 B |
| CustomProviderComponentHtml |    Negative8x3 |  17,124.6 ns |    418.40 ns |    218.83 ns |  17,115.2 ns | 0.3406 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |        **None8x3** |   **1,738.0 ns** |     **57.86 ns** |     **30.26 ns** |   **1,733.0 ns** | **0.0357** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |        None8x3 |  50,719.3 ns |  1,403.63 ns |    734.12 ns |  50,586.8 ns | 0.5040 |     - |     - |  32,485 B |
| CustomProviderComponentHtml |        None8x3 |  18,299.9 ns |  1,959.85 ns |  1,025.04 ns |  18,055.2 ns | 0.3613 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** | **PlainParagraph** |     **173.5 ns** |      **2.94 ns** |      **1.54 ns** |     **173.9 ns** | **0.0034** |     **-** |     **-** |     **128 B** |
|       ProviderComponentHtml | PlainParagraph |  20,714.7 ns |    442.93 ns |    231.66 ns |  20,689.0 ns | 0.4125 |     - |     - |  22,578 B |
| CustomProviderComponentHtml | PlainParagraph |  17,087.8 ns |    384.54 ns |    201.12 ns |  17,040.9 ns | 0.3592 |     - |     - |  19,274 B |
|         **PreparedRenderBlock** |    **Positive8x3** |   **3,234.3 ns** |     **77.64 ns** |     **40.61 ns** |   **3,232.6 ns** | **0.0978** |     **-** |     **-** |   **4,168 B** |
|       ProviderComponentHtml |    Positive8x3 |  64,855.2 ns |  4,077.29 ns |  2,132.50 ns |  64,257.2 ns | 1.2376 |     - |     - |  55,345 B |
| CustomProviderComponentHtml |    Positive8x3 |  17,033.0 ns |    323.23 ns |    169.06 ns |  17,003.8 ns | 0.4973 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |       **Right2x3** |     **679.6 ns** |     **17.41 ns** |      **9.11 ns** |     **675.1 ns** | **0.0136** |     **-** |     **-** |     **520 B** |
|       ProviderComponentHtml |       Right2x3 |  31,147.2 ns |    640.00 ns |    334.73 ns |  31,057.7 ns | 0.6068 |     - |     - |  25,700 B |
| CustomProviderComponentHtml |       Right2x3 |  16,972.0 ns |    490.38 ns |    256.48 ns |  16,888.8 ns | 0.3397 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** | **SparseMixed8x7** |   **5,364.0 ns** |    **220.98 ns** |    **115.58 ns** |   **5,331.2 ns** | **0.1061** |     **-** |     **-** |   **4,808 B** |
|       ProviderComponentHtml | SparseMixed8x7 |  93,124.5 ns |  2,437.03 ns |  1,274.62 ns |  92,840.9 ns | 0.9921 |     - |     - |  66,251 B |
| CustomProviderComponentHtml | SparseMixed8x7 |  17,233.9 ns |  1,122.25 ns |    586.96 ns |  17,049.2 ns | 0.3406 |     - |     - |  18,834 B |
