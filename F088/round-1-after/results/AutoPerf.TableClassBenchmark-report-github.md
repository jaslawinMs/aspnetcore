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
|         **PreparedRenderBlock** |      **Center2x3** |     **708.5 ns** |     **47.87 ns** |     **25.04 ns** | **0.0081** |     **-** |     **-** |     **520 B** |
|       ProviderComponentHtml |      Center2x3 |  52,818.0 ns | 33,407.87 ns | 17,472.96 ns |      - |     - |     - |  25,778 B |
| CustomProviderComponentHtml |      Center2x3 |  17,030.0 ns |    536.20 ns |    280.44 ns | 0.5040 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |        **Left2x3** |     **695.8 ns** |     **51.00 ns** |     **26.68 ns** | **0.0135** |     **-** |     **-** |     **520 B** |
|       ProviderComponentHtml |        Left2x3 |  31,130.5 ns |  1,671.70 ns |    874.33 ns | 0.6188 |     - |     - |  25,692 B |
| CustomProviderComponentHtml |        Left2x3 |  17,548.9 ns |  1,331.25 ns |    696.27 ns | 0.5027 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |     **Missing8x3** |   **1,878.4 ns** |    **146.41 ns** |     **76.58 ns** | **0.0367** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |     Missing8x3 |  52,461.8 ns |    587.69 ns |    307.37 ns | 0.5081 |     - |     - |  32,485 B |
| CustomProviderComponentHtml |     Missing8x3 |  17,228.6 ns |    914.11 ns |    478.10 ns | 0.4987 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |      **Mixed32x8** |  **19,792.6 ns** |    **425.78 ns** |    **222.69 ns** | **0.1959** |     **-** |     **-** |  **11,721 B** |
|       ProviderComponentHtml |      Mixed32x8 | 313,076.1 ns |  7,222.45 ns |  3,777.48 ns | 3.2895 |     - |     - | 163,603 B |
| CustomProviderComponentHtml |      Mixed32x8 |  16,768.3 ns |    257.06 ns |    134.45 ns | 0.4934 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |       **Mixed8x3** |   **2,187.5 ns** |     **91.99 ns** |     **48.11 ns** | **0.0212** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |       Mixed8x3 |  52,672.6 ns |  1,638.76 ns |    857.11 ns | 0.5252 |     - |     - |  36,669 B |
| CustomProviderComponentHtml |       Mixed8x3 |  16,862.5 ns |    365.54 ns |    191.19 ns | 0.5027 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |    **Negative8x3** |   **3,612.2 ns** |    **148.23 ns** |     **77.53 ns** | **0.1067** |     **-** |     **-** |   **4,936 B** |
|       ProviderComponentHtml |    Negative8x3 |  63,453.5 ns |  1,208.14 ns |    631.88 ns | 1.3441 |     - |     - |  60,721 B |
| CustomProviderComponentHtml |    Negative8x3 |  16,836.0 ns |    218.64 ns |    114.35 ns | 0.4987 |     - |     - |  18,835 B |
|         **PreparedRenderBlock** |        **None8x3** |   **1,748.9 ns** |     **30.46 ns** |     **15.93 ns** | **0.0356** |     **-** |     **-** |   **1,480 B** |
|       ProviderComponentHtml |        None8x3 |  50,148.0 ns |    873.02 ns |    456.61 ns | 0.4883 |     - |     - |  32,485 B |
| CustomProviderComponentHtml |        None8x3 |  16,904.1 ns |    560.37 ns |    293.08 ns | 0.3463 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** | **PlainParagraph** |     **174.6 ns** |      **3.06 ns** |      **1.60 ns** | **0.0018** |     **-** |     **-** |     **128 B** |
|       ProviderComponentHtml | PlainParagraph |  20,953.0 ns |  1,316.76 ns |    688.69 ns | 0.4058 |     - |     - |  22,578 B |
| CustomProviderComponentHtml | PlainParagraph |  17,235.0 ns |  1,341.19 ns |    701.47 ns | 0.5054 |     - |     - |  19,274 B |
|         **PreparedRenderBlock** |    **Positive8x3** |   **3,389.5 ns** |    **321.83 ns** |    **168.32 ns** | **0.0965** |     **-** |     **-** |   **4,168 B** |
|       ProviderComponentHtml |    Positive8x3 |  61,172.8 ns |    907.62 ns |    474.70 ns | 1.2376 |     - |     - |  55,345 B |
| CustomProviderComponentHtml |    Positive8x3 |  16,972.8 ns |    417.37 ns |    218.29 ns | 0.3369 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** |       **Right2x3** |     **711.6 ns** |     **17.47 ns** |      **9.14 ns** | **0.0139** |     **-** |     **-** |     **520 B** |
|       ProviderComponentHtml |       Right2x3 |  30,509.0 ns |  1,092.02 ns |    571.15 ns | 0.5981 |     - |     - |  25,700 B |
| CustomProviderComponentHtml |       Right2x3 |  16,927.2 ns |    415.98 ns |    217.56 ns | 0.3425 |     - |     - |  18,834 B |
|         **PreparedRenderBlock** | **SparseMixed8x7** |   **5,368.1 ns** |    **273.36 ns** |    **142.97 ns** | **0.1027** |     **-** |     **-** |   **4,808 B** |
|       ProviderComponentHtml | SparseMixed8x7 |  91,977.2 ns |  1,798.37 ns |    940.58 ns | 0.9058 |     - |     - |  66,250 B |
| CustomProviderComponentHtml | SparseMixed8x7 |  18,020.9 ns |  2,149.63 ns |  1,124.30 ns | 0.3644 |     - |     - |  18,834 B |
