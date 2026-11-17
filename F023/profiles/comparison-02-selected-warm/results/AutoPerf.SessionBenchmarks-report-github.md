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
| **CreateLoadConsume** | **Load.(...)aller [23]** | **420.51 ns** | **12.791 ns** | **5.679 ns** | **0.0213** |     **-** |     **-** |     **872 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **220.62 ns** | **14.107 ns** | **7.378 ns** | **0.0111** |     **-** |     **-** |     **440 B** |
| **CreateLoadConsume** | **Load.(...)aller [24]** | **332.68 ns** | **13.386 ns** | **5.944 ns** | **0.0198** |     **-** |     **-** |     **776 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **295.94 ns** | **11.335 ns** | **5.033 ns** | **0.0181** |     **-** |     **-** |     **760 B** |
| **CreateLoadConsume** | **Load.(...)aller [25]** | **176.94 ns** |  **5.013 ns** | **2.226 ns** | **0.0089** |     **-** |     **-** |     **360 B** |
| **CreateLoadConsume** | **Load.(...).None [23]** | **147.55 ns** |  **8.035 ns** | **4.202 ns** | **0.0088** |     **-** |     **-** |     **344 B** |
| **CreateLoadConsume** | **Loade(...).None [23]** |  **80.92 ns** |  **1.991 ns** | **1.042 ns** | **0.0032** |     **-** |     **-** |     **144 B** |
| **CreateLoadConsume** | **Loade(...).None [24]** |  **80.59 ns** |  **3.270 ns** | **1.710 ns** | **0.0032** |     **-** |     **-** |     **144 B** |
