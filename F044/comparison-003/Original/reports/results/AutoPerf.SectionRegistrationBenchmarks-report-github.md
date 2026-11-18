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
| **RegisterFreshPage** |      **Eight** |    **547.56 ns** |    **50.85 ns** |    **26.596 ns** | **0.0472** |     **-** |     **-** |   **1,824 B** |
|    RenderFullView |      Eight | 18,647.00 ns | 9,316.18 ns | 4,872.543 ns | 0.1865 |     - |     - |  13,202 B |
| **RegisterFreshPage** |  **EightLong** |  **2,952.34 ns** |    **62.40 ns** |    **32.634 ns** | **0.0295** |     **-** |     **-** |   **1,832 B** |
|    RenderFullView |  EightLong | 17,809.56 ns |   610.58 ns |   319.344 ns | 0.5272 |     - |     - |  21,219 B |
| **RegisterFreshPage** | **NoSections** |     **77.45 ns** |    **18.81 ns** |     **9.837 ns** | **0.0120** |     **-** |     **-** |     **472 B** |
|    RenderFullView | NoSections |  5,733.21 ns |   516.21 ns |   269.990 ns | 0.2257 |     - |     - |   8,793 B |
| **RegisterFreshPage** |        **One** |    **132.62 ns** |    **14.27 ns** |     **7.462 ns** | **0.0163** |     **-** |     **-** |     **648 B** |
|    RenderFullView |        One |  6,150.66 ns |   177.90 ns |    93.044 ns | 0.2427 |     - |     - |   9,697 B |
| **RegisterFreshPage** |  **SixtyFour** |  **3,489.13 ns** |   **402.40 ns** |   **210.461 ns** | **0.1996** |     **-** |     **-** |   **8,600 B** |
|    RenderFullView |  SixtyFour | 18,557.95 ns | 1,332.01 ns |   696.669 ns | 0.8867 |     - |     - |  33,724 B |
| **RegisterFreshPage** |        **Two** |    **168.64 ns** |    **16.80 ns** |     **8.784 ns** | **0.0184** |     **-** |     **-** |     **704 B** |
|    RenderFullView |        Two |  6,280.00 ns |   133.57 ns |    69.857 ns | 0.2459 |     - |     - |   9,993 B |
