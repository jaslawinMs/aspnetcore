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
| **RegisterFreshPage** |      **Eight** |    **400.34 ns** |    **35.299 ns** |    **18.462 ns** | **0.0468** |     **-** |     **-** |   **1,824 B** |
|    RenderFullView |      Eight | 20,751.21 ns | 5,638.725 ns | 2,949.162 ns | 0.1860 |     - |     - |  13,210 B |
| **RegisterFreshPage** |  **EightLong** |  **1,758.92 ns** |    **20.086 ns** |    **10.505 ns** | **0.0355** |     **-** |     **-** |   **1,832 B** |
|    RenderFullView |  EightLong | 15,934.27 ns |   668.877 ns |   349.836 ns | 0.4665 |     - |     - |  21,219 B |
| **RegisterFreshPage** | **NoSections** |     **69.79 ns** |     **7.946 ns** |     **4.156 ns** | **0.0121** |     **-** |     **-** |     **472 B** |
|    RenderFullView | NoSections |  5,332.19 ns |   219.433 ns |   114.767 ns | 0.2118 |     - |     - |   8,793 B |
| **RegisterFreshPage** |        **One** |    **109.85 ns** |    **10.541 ns** |     **5.513 ns** | **0.0168** |     **-** |     **-** |     **648 B** |
|    RenderFullView |        One |  5,867.18 ns |   327.198 ns |   171.131 ns | 0.2309 |     - |     - |   9,697 B |
| **RegisterFreshPage** |  **SixtyFour** |  **2,313.82 ns** |   **217.686 ns** |   **113.854 ns** | **0.2214** |     **-** |     **-** |   **8,600 B** |
|    RenderFullView |  SixtyFour | 15,869.92 ns |   722.953 ns |   378.119 ns | 0.7607 |     - |     - |  33,723 B |
| **RegisterFreshPage** |        **Two** |    **121.80 ns** |    **10.575 ns** |     **5.531 ns** | **0.0179** |     **-** |     **-** |     **704 B** |
|    RenderFullView |        Two |  5,833.36 ns |   231.465 ns |   121.060 ns | 0.2309 |     - |     - |   9,993 B |
