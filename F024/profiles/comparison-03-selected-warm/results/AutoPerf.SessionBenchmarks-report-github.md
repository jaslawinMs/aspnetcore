``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F024  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|           Method |                 Case |     Mean |    Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |--------------------- |---------:|---------:|---------:|-------:|------:|------:|----------:|
| **CreateUseConsume** | **Commi(...)aller [29]** | **511.1 ns** | **88.12 ns** | **46.09 ns** | **0.0190** |     **-** |     **-** |     **872 B** |
| **CreateUseConsume** | **Commi(...).None [23]** | **777.6 ns** | **22.40 ns** | **11.71 ns** | **0.0388** |     **-** |     **-** |   **1,712 B** |
| **CreateUseConsume** | **Commi(...)aller [30]** | **401.6 ns** |  **3.10 ns** |  **1.38 ns** | **0.0199** |     **-** |     **-** |     **776 B** |
| **CreateUseConsume** | **Commi(...).None [28]** | **369.9 ns** |  **4.63 ns** |  **2.06 ns** | **0.0186** |     **-** |     **-** |     **760 B** |
| **CreateUseConsume** | **Commi(...)aller [26]** | **745.2 ns** | **20.84 ns** |  **9.25 ns** | **0.0432** |     **-** |     **-** |   **1,632 B** |
| **CreateUseConsume** | **Commi(...).None [24]** | **707.7 ns** |  **9.99 ns** |  **5.22 ns** | **0.0419** |     **-** |     **-** |   **1,616 B** |
| **CreateUseConsume** | **Load.(...).None [21]** | **405.5 ns** |  **9.33 ns** |  **3.33 ns** | **0.0208** |     **-** |     **-** |     **856 B** |
| **CreateUseConsume** | **Load.(...).None [22]** | **392.4 ns** | **11.71 ns** |  **5.20 ns** | **0.0198** |     **-** |     **-** |     **856 B** |
