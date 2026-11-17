``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F023  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|            Method |                 Case |      Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------------------- |----------:|----------:|---------:|-------:|------:|------:|----------:|
| **CreateLoadConsume** | **Load.(...)aller [23]** | **414.04 ns** | **18.206 ns** | **8.084 ns** | **0.0208** |     **-** |     **-** |     **872 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **211.81 ns** |  **2.844 ns** | **1.263 ns** | **0.0107** |     **-** |     **-** |     **440 B** |
| **CreateLoadConsume** | **Load.(...)aller [24]** | **334.15 ns** | **18.333 ns** | **9.588 ns** | **0.0196** |     **-** |     **-** |     **776 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **293.25 ns** | **10.462 ns** | **5.472 ns** | **0.0179** |     **-** |     **-** |     **760 B** |
| **CreateLoadConsume** | **Load.(...)aller [25]** | **174.96 ns** |  **4.545 ns** | **2.377 ns** | **0.0087** |     **-** |     **-** |     **360 B** |
| **CreateLoadConsume** | **Load.(...).None [23]** | **142.87 ns** |  **3.153 ns** | **1.400 ns** | **0.0087** |     **-** |     **-** |     **344 B** |
| **CreateLoadConsume** | **Loade(...).None [23]** |  **81.79 ns** |  **1.977 ns** | **1.034 ns** | **0.0033** |     **-** |     **-** |     **144 B** |
| **CreateLoadConsume** | **Loade(...).None [24]** |  **80.74 ns** |  **2.578 ns** | **1.145 ns** | **0.0033** |     **-** |     **-** |     **144 B** |
