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
| **RegisterFreshPage** |      **Eight** |    **426.20 ns** |    **56.988 ns** |    **29.806 ns** | **0.0465** |     **-** |     **-** |   **1,824 B** |
|    RenderFullView |      Eight | 17,673.11 ns | 9,096.491 ns | 4,757.641 ns | 0.1870 |     - |     - |  13,202 B |
| **RegisterFreshPage** |  **EightLong** |  **2,907.90 ns** |   **153.864 ns** |    **80.474 ns** | **0.0289** |     **-** |     **-** |   **1,832 B** |
|    RenderFullView |  EightLong | 17,145.84 ns |   685.748 ns |   358.659 ns | 0.5014 |     - |     - |  21,219 B |
| **RegisterFreshPage** | **NoSections** |     **67.09 ns** |     **5.432 ns** |     **2.841 ns** | **0.0123** |     **-** |     **-** |     **472 B** |
|    RenderFullView | NoSections |  5,489.25 ns |   278.078 ns |   145.440 ns | 0.1984 |     - |     - |   8,793 B |
| **RegisterFreshPage** |        **One** |    **145.16 ns** |    **46.367 ns** |    **24.251 ns** | **0.0170** |     **-** |     **-** |     **648 B** |
|    RenderFullView |        One |  5,857.85 ns |   450.940 ns |   235.850 ns | 0.2342 |     - |     - |   9,697 B |
| **RegisterFreshPage** |  **SixtyFour** |  **3,095.98 ns** |   **253.533 ns** |   **132.602 ns** | **0.2170** |     **-** |     **-** |   **8,600 B** |
|    RenderFullView |  SixtyFour | 18,041.67 ns |   515.656 ns |   269.698 ns | 0.8905 |     - |     - |  33,724 B |
| **RegisterFreshPage** |        **Two** |    **138.16 ns** |    **30.543 ns** |    **15.975 ns** | **0.0174** |     **-** |     **-** |     **704 B** |
|    RenderFullView |        Two |  6,028.01 ns |   217.579 ns |   113.798 ns | 0.2355 |     - |     - |   9,993 B |
