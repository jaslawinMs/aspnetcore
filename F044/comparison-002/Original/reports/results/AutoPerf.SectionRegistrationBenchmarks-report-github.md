``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F044  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|            Method |    Profile |         Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |----------- |-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
| **RegisterFreshPage** |      **Eight** |    **408.33 ns** |    **31.131 ns** |    **16.282 ns** | **0.0480** |     **-** |     **-** |   **1,824 B** |
|    RenderFullView |      Eight | 19,169.99 ns | 6,921.836 ns | 3,620.254 ns | 0.1848 |     - |     - |  13,202 B |
| **RegisterFreshPage** |  **EightLong** |  **2,885.20 ns** |    **49.765 ns** |    **26.028 ns** | **0.0283** |     **-** |     **-** |   **1,832 B** |
|    RenderFullView |  EightLong | 16,996.10 ns |   255.880 ns |   133.830 ns | 0.4971 |     - |     - |  21,219 B |
| **RegisterFreshPage** | **NoSections** |     **63.22 ns** |     **4.157 ns** |     **2.174 ns** | **0.0124** |     **-** |     **-** |     **472 B** |
|    RenderFullView | NoSections |  5,085.48 ns |    73.169 ns |    38.269 ns | 0.1992 |     - |     - |   8,793 B |
| **RegisterFreshPage** |        **One** |    **106.47 ns** |    **17.218 ns** |     **9.005 ns** | **0.0164** |     **-** |     **-** |     **648 B** |
|    RenderFullView |        One |  5,527.13 ns |   206.101 ns |   107.795 ns | 0.2189 |     - |     - |   9,697 B |
| **RegisterFreshPage** |  **SixtyFour** |  **2,829.94 ns** |   **206.744 ns** |   **108.131 ns** | **0.2151** |     **-** |     **-** |   **8,600 B** |
|    RenderFullView |  SixtyFour | 16,621.01 ns | 1,332.468 ns |   696.907 ns | 0.8044 |     - |     - |  33,723 B |
| **RegisterFreshPage** |        **Two** |    **124.80 ns** |     **4.339 ns** |     **2.269 ns** | **0.0184** |     **-** |     **-** |     **704 B** |
|    RenderFullView |        Two |  5,845.73 ns |   617.790 ns |   323.116 ns | 0.2303 |     - |     - |   9,993 B |
