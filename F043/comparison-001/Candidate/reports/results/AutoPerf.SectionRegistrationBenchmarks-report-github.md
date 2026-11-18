``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F043  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|            Method |    Profile |         Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |----------- |-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
| **RegisterFreshPage** |      **Eight** |    **374.65 ns** |    **47.093 ns** |    **24.631 ns** | **0.0514** |     **-** |     **-** |   **1,920 B** |
|    RenderFullView |      Eight | 18,500.58 ns | 9,426.830 ns | 4,930.414 ns | 0.1906 |     - |     - |  13,299 B |
| **RegisterFreshPage** |  **EightLong** |  **1,749.53 ns** |    **30.377 ns** |    **15.888 ns** | **0.0515** |     **-** |     **-** |   **1,928 B** |
|    RenderFullView |  EightLong | 15,208.44 ns | 1,231.560 ns |   644.130 ns | 0.4447 |     - |     - |  21,315 B |
| **RegisterFreshPage** | **NoSections** |     **83.94 ns** |     **8.349 ns** |     **4.367 ns** | **0.0148** |     **-** |     **-** |     **568 B** |
|    RenderFullView | NoSections |  5,098.42 ns |   300.219 ns |   157.020 ns | 0.1999 |     - |     - |   8,889 B |
| **RegisterFreshPage** |        **One** |    **120.40 ns** |    **16.782 ns** |     **8.777 ns** | **0.0189** |     **-** |     **-** |     **744 B** |
|    RenderFullView |        One |  5,524.28 ns |   408.719 ns |   213.768 ns | 0.2173 |     - |     - |   9,793 B |
| **RegisterFreshPage** |  **SixtyFour** |  **2,223.54 ns** |   **403.873 ns** |   **211.234 ns** | **0.2159** |     **-** |     **-** |   **8,696 B** |
|    RenderFullView |  SixtyFour | 15,520.06 ns |   939.658 ns |   491.460 ns | 0.8958 |     - |     - |  33,820 B |
| **RegisterFreshPage** |        **Two** |    **140.76 ns** |    **14.288 ns** |     **7.473 ns** | **0.0202** |     **-** |     **-** |     **800 B** |
|    RenderFullView |        Two |  5,689.17 ns |   294.969 ns |   154.274 ns | 0.2208 |     - |     - |  10,089 B |
