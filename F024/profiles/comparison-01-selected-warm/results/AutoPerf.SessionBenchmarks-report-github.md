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
| **CreateUseConsume** | **Commi(...)aller [29]** | **459.0 ns** |  **6.96 ns** |  **3.09 ns** | **0.0185** |     **-** |     **-** |     **808 B** |
| **CreateUseConsume** | **Commi(...).None [23]** | **770.9 ns** | **21.38 ns** | **11.18 ns** | **0.0383** |     **-** |     **-** |   **1,648 B** |
| **CreateUseConsume** | **Commi(...)aller [30]** | **375.0 ns** |  **4.77 ns** |  **2.12 ns** | **0.0191** |     **-** |     **-** |     **712 B** |
| **CreateUseConsume** | **Commi(...).None [28]** | **345.6 ns** |  **4.26 ns** |  **2.23 ns** | **0.0175** |     **-** |     **-** |     **696 B** |
| **CreateUseConsume** | **Commi(...)aller [26]** | **698.5 ns** | **40.05 ns** | **17.78 ns** | **0.0362** |     **-** |     **-** |   **1,568 B** |
| **CreateUseConsume** | **Commi(...).None [24]** | **673.5 ns** | **21.50 ns** | **11.24 ns** | **0.0398** |     **-** |     **-** |   **1,552 B** |
| **CreateUseConsume** | **Load.(...).None [21]** | **397.1 ns** | **17.21 ns** |  **7.64 ns** | **0.0198** |     **-** |     **-** |     **856 B** |
| **CreateUseConsume** | **Load.(...).None [22]** | **389.4 ns** |  **5.78 ns** |  **2.57 ns** | **0.0228** |     **-** |     **-** |     **856 B** |
