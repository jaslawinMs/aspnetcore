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
| **RegisterFreshPage** |      **Eight** |    **420.12 ns** |    **48.400 ns** |    **25.314 ns** | **0.0480** |     **-** |     **-** |   **1,920 B** |
|    RenderFullView |      Eight | 17,577.14 ns | 9,135.579 ns | 4,778.085 ns | 0.1788 |     - |     - |  13,292 B |
| **RegisterFreshPage** |  **EightLong** |  **2,889.89 ns** |    **44.757 ns** |    **23.409 ns** | **0.0288** |     **-** |     **-** |   **1,928 B** |
|    RenderFullView |  EightLong | 16,599.77 ns |   569.334 ns |   297.773 ns | 0.4845 |     - |     - |  21,315 B |
| **RegisterFreshPage** | **NoSections** |     **78.98 ns** |     **8.861 ns** |     **4.635 ns** | **0.0147** |     **-** |     **-** |     **568 B** |
|    RenderFullView | NoSections |  4,997.17 ns |   355.952 ns |   186.170 ns | 0.1941 |     - |     - |   8,889 B |
| **RegisterFreshPage** |        **One** |    **116.35 ns** |     **9.123 ns** |     **4.771 ns** | **0.0193** |     **-** |     **-** |     **744 B** |
|    RenderFullView |        One |  5,574.26 ns |   314.325 ns |   164.398 ns | 0.2256 |     - |     - |   9,793 B |
| **RegisterFreshPage** |  **SixtyFour** |  **2,792.57 ns** |   **405.951 ns** |   **212.320 ns** | **0.2128** |     **-** |     **-** |   **8,696 B** |
|    RenderFullView |  SixtyFour | 15,749.66 ns |   507.399 ns |   265.379 ns | 0.7727 |     - |     - |  33,819 B |
| **RegisterFreshPage** |        **Two** |    **139.22 ns** |     **9.927 ns** |     **5.192 ns** | **0.0205** |     **-** |     **-** |     **800 B** |
|    RenderFullView |        Two |  5,766.45 ns |   631.653 ns |   330.367 ns | 0.2226 |     - |     - |  10,089 B |
