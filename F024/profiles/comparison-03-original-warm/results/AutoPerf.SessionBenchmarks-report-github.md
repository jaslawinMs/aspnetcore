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
| **CreateUseConsume** | **Commi(...)aller [29]** | **469.4 ns** | **13.71 ns** | **7.17 ns** | **0.0188** |     **-** |     **-** |     **808 B** |
| **CreateUseConsume** | **Commi(...).None [23]** | **772.9 ns** | **11.05 ns** | **4.91 ns** | **0.0386** |     **-** |     **-** |   **1,648 B** |
| **CreateUseConsume** | **Commi(...)aller [30]** | **447.2 ns** |  **5.81 ns** | **2.58 ns** | **0.0179** |     **-** |     **-** |     **808 B** |
| **CreateUseConsume** | **Commi(...).None [28]** | **425.2 ns** | **17.49 ns** | **7.76 ns** | **0.0211** |     **-** |     **-** |     **792 B** |
| **CreateUseConsume** | **Commi(...)aller [26]** | **798.5 ns** | **17.21 ns** | **6.14 ns** | **0.0406** |     **-** |     **-** |   **1,664 B** |
| **CreateUseConsume** | **Commi(...).None [24]** | **752.1 ns** | **10.94 ns** | **4.86 ns** | **0.0374** |     **-** |     **-** |   **1,648 B** |
| **CreateUseConsume** | **Load.(...).None [21]** | **403.0 ns** |  **5.53 ns** | **2.45 ns** | **0.0202** |     **-** |     **-** |     **856 B** |
| **CreateUseConsume** | **Load.(...).None [22]** | **392.3 ns** |  **9.61 ns** | **4.27 ns** | **0.0197** |     **-** |     **-** |     **856 B** |
