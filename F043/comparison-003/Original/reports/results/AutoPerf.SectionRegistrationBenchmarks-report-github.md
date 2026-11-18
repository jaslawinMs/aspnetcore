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
| **RegisterFreshPage** |      **Eight** |    **421.87 ns** |    **41.109 ns** |    **21.501 ns** | **0.0492** |     **-** |     **-** |   **1,920 B** |
|    RenderFullView |      Eight | 19,450.56 ns | 7,377.420 ns | 3,858.533 ns | 0.1785 |     - |     - |  13,298 B |
| **RegisterFreshPage** |  **EightLong** |  **2,890.60 ns** |    **49.496 ns** |    **25.888 ns** | **0.0290** |     **-** |     **-** |   **1,928 B** |
|    RenderFullView |  EightLong | 16,665.26 ns |   926.208 ns |   484.425 ns | 0.4969 |     - |     - |  21,315 B |
| **RegisterFreshPage** | **NoSections** |     **79.70 ns** |     **7.300 ns** |     **3.818 ns** | **0.0152** |     **-** |     **-** |     **568 B** |
|    RenderFullView | NoSections |  4,945.50 ns |   170.999 ns |    89.436 ns | 0.2006 |     - |     - |   8,889 B |
| **RegisterFreshPage** |        **One** |    **116.69 ns** |    **11.268 ns** |     **5.894 ns** | **0.0194** |     **-** |     **-** |     **744 B** |
|    RenderFullView |        One |  5,578.97 ns |   459.168 ns |   240.154 ns | 0.2196 |     - |     - |   9,793 B |
| **RegisterFreshPage** |  **SixtyFour** |  **2,836.37 ns** |   **368.709 ns** |   **192.842 ns** | **0.2324** |     **-** |     **-** |   **8,696 B** |
|    RenderFullView |  SixtyFour | 16,475.01 ns | 1,300.994 ns |   680.445 ns | 0.7813 |     - |     - |  33,819 B |
| **RegisterFreshPage** |        **Two** |    **144.90 ns** |    **26.704 ns** |    **13.967 ns** | **0.0208** |     **-** |     **-** |     **800 B** |
|    RenderFullView |        Two |  5,719.15 ns |   261.978 ns |   137.020 ns | 0.2298 |     - |     - |  10,089 B |
