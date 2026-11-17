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
| **CreateUseConsume** | **Commi(...)aller [29]** | **466.1 ns** |  **7.78 ns** |  **3.46 ns** | **0.0187** |     **-** |     **-** |     **872 B** |
| **CreateUseConsume** | **Commi(...).None [23]** | **767.7 ns** | **15.65 ns** |  **8.19 ns** | **0.0457** |     **-** |     **-** |   **1,712 B** |
| **CreateUseConsume** | **Commi(...)aller [30]** | **457.4 ns** |  **8.95 ns** |  **3.97 ns** | **0.0228** |     **-** |     **-** |     **872 B** |
| **CreateUseConsume** | **Commi(...).None [28]** | **422.0 ns** | **18.88 ns** |  **9.87 ns** | **0.0212** |     **-** |     **-** |     **856 B** |
| **CreateUseConsume** | **Commi(...)aller [26]** | **801.0 ns** | **51.69 ns** | **27.04 ns** | **0.0456** |     **-** |     **-** |   **1,728 B** |
| **CreateUseConsume** | **Commi(...).None [24]** | **751.8 ns** | **13.49 ns** |  **5.99 ns** | **0.0450** |     **-** |     **-** |   **1,712 B** |
| **CreateUseConsume** | **Load.(...).None [21]** | **395.3 ns** |  **3.87 ns** |  **2.03 ns** | **0.0196** |     **-** |     **-** |     **856 B** |
| **CreateUseConsume** | **Load.(...).None [22]** | **407.8 ns** | **82.02 ns** | **42.90 ns** | **0.0204** |     **-** |     **-** |     **856 B** |
