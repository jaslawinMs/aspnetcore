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
| **CreateUseConsume** | **Commi(...)aller [29]** | **478.7 ns** |  **8.49 ns** |  **3.77 ns** | **0.0192** |     **-** |     **-** |     **872 B** |
| **CreateUseConsume** | **Commi(...).None [23]** | **819.4 ns** |  **9.01 ns** |  **3.21 ns** | **0.0409** |     **-** |     **-** |   **1,712 B** |
| **CreateUseConsume** | **Commi(...)aller [30]** | **397.7 ns** |  **5.94 ns** |  **2.64 ns** | **0.0200** |     **-** |     **-** |     **776 B** |
| **CreateUseConsume** | **Commi(...).None [28]** | **369.8 ns** | **22.15 ns** | **11.59 ns** | **0.0181** |     **-** |     **-** |     **760 B** |
| **CreateUseConsume** | **Commi(...)aller [26]** | **763.2 ns** | **11.77 ns** |  **5.23 ns** | **0.0375** |     **-** |     **-** |   **1,632 B** |
| **CreateUseConsume** | **Commi(...).None [24]** | **736.5 ns** | **24.39 ns** | **10.83 ns** | **0.0368** |     **-** |     **-** |   **1,616 B** |
| **CreateUseConsume** | **Load.(...).None [21]** | **398.4 ns** |  **5.88 ns** |  **3.07 ns** | **0.0199** |     **-** |     **-** |     **856 B** |
| **CreateUseConsume** | **Load.(...).None [22]** | **384.6 ns** |  **5.61 ns** |  **2.93 ns** | **0.0195** |     **-** |     **-** |     **856 B** |
