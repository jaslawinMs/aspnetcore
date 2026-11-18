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
| **RegisterFreshPage** |      **Eight** |    **354.89 ns** |    **16.456 ns** |     **8.607 ns** | **0.0480** |     **-** |     **-** |   **1,920 B** |
|    RenderFullView |      Eight | 20,810.66 ns | 6,103.888 ns | 3,192.451 ns | 0.1895 |     - |     - |  13,323 B |
| **RegisterFreshPage** |  **EightLong** |  **1,751.00 ns** |    **32.149 ns** |    **16.815 ns** | **0.0515** |     **-** |     **-** |   **1,928 B** |
|    RenderFullView |  EightLong | 15,521.59 ns |   347.196 ns |   181.590 ns | 0.4446 |     - |     - |  21,315 B |
| **RegisterFreshPage** | **NoSections** |     **78.88 ns** |     **9.582 ns** |     **5.012 ns** | **0.0150** |     **-** |     **-** |     **568 B** |
|    RenderFullView | NoSections |  5,254.39 ns |   606.531 ns |   317.227 ns | 0.2096 |     - |     - |   8,889 B |
| **RegisterFreshPage** |        **One** |    **118.43 ns** |    **12.202 ns** |     **6.382 ns** | **0.0193** |     **-** |     **-** |     **744 B** |
|    RenderFullView |        One |  5,594.37 ns |   514.857 ns |   269.280 ns | 0.2135 |     - |     - |   9,793 B |
| **RegisterFreshPage** |  **SixtyFour** |  **2,161.93 ns** |   **332.468 ns** |   **173.887 ns** | **0.2151** |     **-** |     **-** |   **8,696 B** |
|    RenderFullView |  SixtyFour | 15,391.12 ns |   591.697 ns |   309.469 ns | 0.8805 |     - |     - |  33,820 B |
| **RegisterFreshPage** |        **Two** |    **135.29 ns** |    **15.351 ns** |     **8.029 ns** | **0.0209** |     **-** |     **-** |     **800 B** |
|    RenderFullView |        Two |  5,741.72 ns |   244.651 ns |   127.957 ns | 0.2285 |     - |     - |  10,089 B |
