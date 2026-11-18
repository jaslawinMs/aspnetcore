``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F044  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|            Method |    Profile |         Mean |       Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |----------- |-------------:|------------:|-------------:|-------:|------:|------:|----------:|
| **RegisterFreshPage** |      **Eight** |    **479.54 ns** |    **95.60 ns** |    **50.000 ns** | **0.0474** |     **-** |     **-** |   **1,824 B** |
|    RenderFullView |      Eight | 14,366.77 ns | 6,055.99 ns | 3,167.402 ns | 0.1921 |     - |     - |  13,167 B |
| **RegisterFreshPage** |  **EightLong** |  **1,806.57 ns** |    **37.20 ns** |    **19.457 ns** | **0.0360** |     **-** |     **-** |   **1,832 B** |
|    RenderFullView |  EightLong | 16,375.03 ns |   628.76 ns |   328.854 ns | 0.4806 |     - |     - |  21,219 B |
| **RegisterFreshPage** | **NoSections** |     **73.43 ns** |    **14.32 ns** |     **7.491 ns** | **0.0123** |     **-** |     **-** |     **472 B** |
|    RenderFullView | NoSections |  5,546.85 ns |   232.84 ns |   121.779 ns | 0.2187 |     - |     - |   8,793 B |
| **RegisterFreshPage** |        **One** |    **185.74 ns** |    **39.82 ns** |    **20.827 ns** | **0.0162** |     **-** |     **-** |     **648 B** |
|    RenderFullView |        One |  6,172.46 ns |   360.44 ns |   188.519 ns | 0.2446 |     - |     - |   9,697 B |
| **RegisterFreshPage** |  **SixtyFour** |  **2,622.94 ns** |   **114.91 ns** |    **60.100 ns** | **0.2296** |     **-** |     **-** |   **8,600 B** |
|    RenderFullView |  SixtyFour | 17,494.84 ns | 1,047.12 ns |   547.667 ns | 0.8636 |     - |     - |  33,724 B |
| **RegisterFreshPage** |        **Two** |    **144.79 ns** |    **17.47 ns** |     **9.138 ns** | **0.0178** |     **-** |     **-** |     **704 B** |
|    RenderFullView |        Two |  6,261.42 ns |   469.47 ns |   245.540 ns | 0.2434 |     - |     - |   9,993 B |
