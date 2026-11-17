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
| **CreateLoadConsume** | **Load.(...)aller [23]** | **948.36 ns** | **965.826 ns** | **505.145 ns** | **0.0219** |     **-** |     **-** |     **872 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **239.96 ns** |   **5.105 ns** |   **2.267 ns** | **0.0117** |     **-** |     **-** |     **440 B** |
| **CreateLoadConsume** | **Load.(...)aller [24]** | **402.54 ns** |   **9.539 ns** |   **4.989 ns** | **0.0212** |     **-** |     **-** |     **872 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **375.64 ns** |  **18.687 ns** |   **9.774 ns** | **0.0226** |     **-** |     **-** |     **856 B** |
| **CreateLoadConsume** | **Load.(...)aller [25]** | **259.54 ns** |  **11.407 ns** |   **5.966 ns** | **0.0106** |     **-** |     **-** |     **456 B** |
| **CreateLoadConsume** | **Load.(...).None [23]** | **233.91 ns** |  **16.919 ns** |   **8.849 ns** | **0.0113** |     **-** |     **-** |     **440 B** |
| **CreateLoadConsume** | **Loade(...).None [23]** |  **80.92 ns** |   **2.240 ns** |   **1.171 ns** | **0.0033** |     **-** |     **-** |     **144 B** |
| **CreateLoadConsume** | **Loade(...).None [24]** |  **80.61 ns** |   **2.867 ns** |   **1.499 ns** | **0.0032** |     **-** |     **-** |     **144 B** |
