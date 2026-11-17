``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F024  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|           Method |                 Case |     Mean |    Error |  StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |--------------------- |---------:|---------:|--------:|-------:|------:|------:|----------:|
| **CreateUseConsume** | **Commi(...)aller [29]** | **464.9 ns** |  **9.95 ns** | **4.42 ns** | **0.0189** |     **-** |     **-** |     **872 B** |
| **CreateUseConsume** | **Commi(...).None [23]** | **780.2 ns** | **11.58 ns** | **5.14 ns** | **0.0393** |     **-** |     **-** |   **1,712 B** |
| **CreateUseConsume** | **Commi(...)aller [30]** | **459.3 ns** |  **5.33 ns** | **2.37 ns** | **0.0231** |     **-** |     **-** |     **872 B** |
| **CreateUseConsume** | **Commi(...).None [28]** | **428.3 ns** | **12.37 ns** | **5.49 ns** | **0.0212** |     **-** |     **-** |     **856 B** |
| **CreateUseConsume** | **Commi(...)aller [26]** | **795.4 ns** |  **9.40 ns** | **3.35 ns** | **0.0398** |     **-** |     **-** |   **1,728 B** |
| **CreateUseConsume** | **Commi(...).None [24]** | **771.4 ns** | **16.51 ns** | **8.64 ns** | **0.0385** |     **-** |     **-** |   **1,712 B** |
| **CreateUseConsume** | **Load.(...).None [21]** | **408.1 ns** | **19.64 ns** | **8.72 ns** | **0.0203** |     **-** |     **-** |     **856 B** |
| **CreateUseConsume** | **Load.(...).None [22]** | **384.9 ns** |  **6.95 ns** | **3.09 ns** | **0.0201** |     **-** |     **-** |     **856 B** |
