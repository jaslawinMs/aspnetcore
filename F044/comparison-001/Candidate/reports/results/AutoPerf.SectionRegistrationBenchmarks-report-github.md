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
| **RegisterFreshPage** |      **Eight** |    **361.41 ns** |    **52.391 ns** |    **27.402 ns** | **0.0464** |     **-** |     **-** |   **1,824 B** |
|    RenderFullView |      Eight | 18,863.44 ns | 9,702.279 ns | 5,074.479 ns | 0.1823 |     - |     - |  13,202 B |
| **RegisterFreshPage** |  **EightLong** |  **1,747.20 ns** |   **110.114 ns** |    **57.592 ns** | **0.0346** |     **-** |     **-** |   **1,832 B** |
|    RenderFullView |  EightLong | 15,394.96 ns |   554.510 ns |   290.019 ns | 0.4610 |     - |     - |  21,219 B |
| **RegisterFreshPage** | **NoSections** |     **63.87 ns** |     **7.548 ns** |     **3.948 ns** | **0.0122** |     **-** |     **-** |     **472 B** |
|    RenderFullView | NoSections |  5,159.01 ns |   144.835 ns |    75.751 ns | 0.2020 |     - |     - |   8,793 B |
| **RegisterFreshPage** |        **One** |    **117.12 ns** |    **32.487 ns** |    **16.991 ns** | **0.0165** |     **-** |     **-** |     **648 B** |
|    RenderFullView |        One |  5,752.49 ns |   591.634 ns |   309.436 ns | 0.2207 |     - |     - |   9,697 B |
| **RegisterFreshPage** |  **SixtyFour** |  **2,356.59 ns** |   **301.729 ns** |   **157.810 ns** | **0.2106** |     **-** |     **-** |   **8,600 B** |
|    RenderFullView |  SixtyFour | 16,558.32 ns | 2,009.627 ns | 1,051.074 ns | 0.7529 |     - |     - |  33,723 B |
| **RegisterFreshPage** |        **Two** |    **124.04 ns** |    **11.159 ns** |     **5.837 ns** | **0.0188** |     **-** |     **-** |     **704 B** |
|    RenderFullView |        Two |  5,873.73 ns |   480.993 ns |   251.568 ns | 0.2375 |     - |     - |   9,993 B |
