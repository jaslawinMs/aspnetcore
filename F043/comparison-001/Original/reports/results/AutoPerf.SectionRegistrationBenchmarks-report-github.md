``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F043  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|            Method |    Profile |         Mean |       Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |----------- |-------------:|------------:|-------------:|-------:|------:|------:|----------:|
| **RegisterFreshPage** |      **Eight** |    **426.93 ns** |    **29.14 ns** |    **15.243 ns** | **0.0492** |     **-** |     **-** |   **1,920 B** |
|    RenderFullView |      Eight | 20,691.55 ns | 4,585.62 ns | 2,398.369 ns | 0.1877 |     - |     - |  13,304 B |
| **RegisterFreshPage** |  **EightLong** |  **2,922.21 ns** |   **175.39 ns** |    **91.734 ns** | **0.0290** |     **-** |     **-** |   **1,928 B** |
|    RenderFullView |  EightLong | 16,674.64 ns |   982.52 ns |   513.875 ns | 0.4956 |     - |     - |  21,315 B |
| **RegisterFreshPage** | **NoSections** |     **89.15 ns** |    **24.92 ns** |    **13.034 ns** | **0.0146** |     **-** |     **-** |     **568 B** |
|    RenderFullView | NoSections |  5,315.89 ns | 1,208.60 ns |   632.122 ns | 0.2028 |     - |     - |   8,889 B |
| **RegisterFreshPage** |        **One** |    **136.66 ns** |    **69.59 ns** |    **36.398 ns** | **0.0191** |     **-** |     **-** |     **744 B** |
|    RenderFullView |        One |  5,652.54 ns |   428.25 ns |   223.984 ns | 0.2254 |     - |     - |   9,793 B |
| **RegisterFreshPage** |  **SixtyFour** |  **3,029.45 ns** |   **262.85 ns** |   **137.475 ns** | **0.2233** |     **-** |     **-** |   **8,696 B** |
|    RenderFullView |  SixtyFour | 16,645.34 ns | 1,556.10 ns |   813.872 ns | 0.7910 |     - |     - |  33,820 B |
| **RegisterFreshPage** |        **Two** |    **148.50 ns** |    **13.21 ns** |     **6.911 ns** | **0.0209** |     **-** |     **-** |     **800 B** |
|    RenderFullView |        Two |  5,768.54 ns |   336.32 ns |   175.902 ns | 0.2270 |     - |     - |  10,089 B |
