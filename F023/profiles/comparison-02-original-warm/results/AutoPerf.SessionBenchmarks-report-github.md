``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F023  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|            Method |                 Case |      Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------------------- |----------:|----------:|----------:|-------:|------:|------:|----------:|
| **CreateLoadConsume** | **Load.(...)aller [23]** | **415.72 ns** | **15.421 ns** |  **6.847 ns** | **0.0213** |     **-** |     **-** |     **872 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **212.64 ns** |  **8.062 ns** |  **3.580 ns** | **0.0107** |     **-** |     **-** |     **440 B** |
| **CreateLoadConsume** | **Load.(...)aller [24]** | **414.85 ns** | **13.195 ns** |  **5.859 ns** | **0.0232** |     **-** |     **-** |     **872 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **379.52 ns** | **20.645 ns** | **10.798 ns** | **0.0220** |     **-** |     **-** |     **856 B** |
| **CreateLoadConsume** | **Load.(...)aller [25]** | **240.87 ns** | **14.874 ns** |  **7.779 ns** | **0.0115** |     **-** |     **-** |     **456 B** |
| **CreateLoadConsume** | **Load.(...).None [23]** | **205.78 ns** | **11.655 ns** |  **6.096 ns** | **0.0102** |     **-** |     **-** |     **440 B** |
| **CreateLoadConsume** | **Loade(...).None [23]** |  **80.52 ns** |  **1.021 ns** |  **0.453 ns** | **0.0033** |     **-** |     **-** |     **144 B** |
| **CreateLoadConsume** | **Loade(...).None [24]** |  **81.97 ns** |  **2.035 ns** |  **1.064 ns** | **0.0033** |     **-** |     **-** |     **144 B** |
