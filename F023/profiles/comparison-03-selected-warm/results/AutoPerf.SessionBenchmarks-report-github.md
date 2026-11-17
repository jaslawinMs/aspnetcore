``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F023  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|            Method |                 Case |      Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------------------- |----------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **CreateLoadConsume** | **Load.(...)aller [23]** | **815.25 ns** | **437.470 ns** | **228.805 ns** | **0.0164** |     **-** |     **-** |     **872 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **213.11 ns** |   **7.793 ns** |   **4.076 ns** | **0.0107** |     **-** |     **-** |     **440 B** |
| **CreateLoadConsume** | **Load.(...)aller [24]** | **339.87 ns** |  **11.355 ns** |   **5.939 ns** | **0.0202** |     **-** |     **-** |     **776 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **296.31 ns** |  **25.304 ns** |  **13.234 ns** | **0.0179** |     **-** |     **-** |     **760 B** |
| **CreateLoadConsume** | **Load.(...)aller [25]** | **176.89 ns** |   **9.366 ns** |   **4.159 ns** | **0.0089** |     **-** |     **-** |     **360 B** |
| **CreateLoadConsume** | **Load.(...).None [23]** | **144.65 ns** |   **4.647 ns** |   **2.431 ns** | **0.0086** |     **-** |     **-** |     **344 B** |
| **CreateLoadConsume** | **Loade(...).None [23]** |  **79.27 ns** |   **2.001 ns** |   **0.888 ns** | **0.0032** |     **-** |     **-** |     **144 B** |
| **CreateLoadConsume** | **Loade(...).None [24]** |  **79.36 ns** |   **4.356 ns** |   **1.934 ns** | **0.0033** |     **-** |     **-** |     **144 B** |
