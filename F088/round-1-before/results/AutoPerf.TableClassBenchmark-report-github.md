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
|         **PreparedRenderBlock** |      **Center2x3** |   **1,075.4 ns** |     **86.64 ns** |     **45.31 ns** | **0.0313** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |      Center2x3 |  43,720.9 ns | 10,187.83 ns |  5,328.43 ns |      - |     - |     - |  32,578 B |
| CustomProviderComponentHtml |      Center2x3 |  16,729.7 ns |    184.95 ns |     96.73 ns | 0.3425 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |        **Left2x3** |   **1,086.5 ns** |    **115.65 ns** |     **60.49 ns** | **0.0313** |     **-** |     **-** |   **1,384 B** |
|       ProviderComponentHtml |        Left2x3 |  35,739.4 ns |  3,896.20 ns |  2,037.79 ns | 0.6720 |     - |     - |  31,740 B |
| CustomProviderComponentHtml |        Left2x3 |  16,670.1 ns |    257.22 ns |    134.53 ns | 0.3482 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |     **Missing8x3** |   **1,793.3 ns** |     **51.24 ns** |     **26.80 ns** | **0.0350** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |     Missing8x3 |  52,442.3 ns |  1,660.38 ns |    868.41 ns | 0.5081 |     - |     - |  32,486 B |
| CustomProviderComponentHtml |     Missing8x3 |  17,472.1 ns |  1,087.53 ns |    568.80 ns | 0.5013 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |      **Mixed32x8** |  **41,883.4 ns** |  **1,485.17 ns** |    **776.77 ns** | **0.9542** |     **-** |     **-** |  **50,380 B** |
|       ProviderComponentHtml |      Mixed32x8 | 427,170.5 ns | 40,039.41 ns | 20,941.39 ns | 8.3333 |     - |     - | 434,218 B |
| CustomProviderComponentHtml |      Mixed32x8 |  17,285.5 ns |    959.03 ns |    501.59 ns | 0.5027 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |       **Mixed8x3** |   **3,839.2 ns** |    **388.17 ns** |    **203.02 ns** | **0.1063** |     **-** |     **-** |   **5,128 B** |
|       ProviderComponentHtml |       Mixed8x3 |  65,893.8 ns |  2,612.96 ns |  1,366.63 ns | 1.2755 |     - |     - |  62,209 B |
| CustomProviderComponentHtml |       Mixed8x3 |  16,987.9 ns |    415.62 ns |    217.38 ns | 0.5054 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |    **Negative8x3** |   **3,505.5 ns** |    **203.55 ns** |    **106.46 ns** | **0.1065** |     **-** |     **-** |   **4,936 B** |
|       ProviderComponentHtml |    Negative8x3 |  66,670.3 ns |  2,448.18 ns |  1,280.44 ns | 1.2500 |     - |     - |  60,721 B |
| CustomProviderComponentHtml |    Negative8x3 |  17,759.1 ns |  1,792.06 ns |    937.28 ns | 0.5040 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |        **None8x3** |   **1,884.2 ns** |     **76.71 ns** |     **40.12 ns** | **0.0377** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |        None8x3 |  52,283.4 ns |  3,936.95 ns |  2,059.10 ns | 0.5000 |     - |     - |  32,485 B |
| CustomProviderComponentHtml |        None8x3 |  17,310.1 ns |  1,910.97 ns |    999.47 ns | 0.3406 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** | **PlainParagraph** |     **180.3 ns** |     **13.25 ns** |      **6.93 ns** | **0.0017** |     **-** |     **-** |     **128 B** |
|       ProviderComponentHtml | PlainParagraph |  21,328.4 ns |  1,047.39 ns |    547.81 ns | 0.4125 |     - |     - |  22,578 B |
| CustomProviderComponentHtml | PlainParagraph |  17,714.5 ns |  1,488.32 ns |    778.42 ns | 0.5123 |     - |     - |  19,274 B |
|         **PreparedRenderBlock** |    **Positive8x3** |   **3,308.4 ns** |    **352.82 ns** |    **184.53 ns** | **0.1005** |     **-** |     **-** |   **4,168 B** |
|       ProviderComponentHtml |    Positive8x3 |  63,855.0 ns |  3,219.54 ns |  1,683.88 ns | 1.3158 |     - |     - |  55,345 B |
| CustomProviderComponentHtml |    Positive8x3 |  21,619.8 ns |  3,451.47 ns |  1,805.19 ns | 0.3369 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |       **Right2x3** |   **1,033.2 ns** |     **14.46 ns** |      **7.56 ns** | **0.0313** |     **-** |     **-** |   **1,432 B** |
|       ProviderComponentHtml |       Right2x3 |  33,971.8 ns |  1,568.65 ns |    820.44 ns | 0.7022 |     - |     - |  32,085 B |
| CustomProviderComponentHtml |       Right2x3 |  17,421.2 ns |  1,657.26 ns |    866.78 ns | 0.5040 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** | **SparseMixed8x7** |   **6,784.2 ns** |    **337.26 ns** |    **176.39 ns** | **0.2150** |     **-** |     **-** |   **8,457 B** |
|       ProviderComponentHtml | SparseMixed8x7 | 103,254.9 ns |  3,990.61 ns |  2,087.17 ns | 2.0833 |     - |     - |  91,791 B |
| CustomProviderComponentHtml | SparseMixed8x7 |  17,595.3 ns |  1,375.22 ns |    719.27 ns | 0.5040 |     - |     - |  18,835 B |
