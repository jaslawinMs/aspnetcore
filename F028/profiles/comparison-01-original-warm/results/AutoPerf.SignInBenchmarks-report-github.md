``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F028  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|            Method |                 Case |        Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------------------- |------------:|----------:|---------:|-------:|------:|------:|----------:|
| **ResolveAndConsume** |   **Default.Empty.Miss** |   **189.62 ns** |  **3.410 ns** | **1.514 ns** | **0.0132** |     **-** |     **-** |     **528 B** |
| **ResolveAndConsume** |    **Default.Four.Tail** |   **237.50 ns** |  **3.864 ns** | **1.378 ns** | **0.0144** |     **-** |     **-** |     **576 B** |
| **ResolveAndConsume** |    **Default.Many.Head** |   **210.94 ns** |  **8.796 ns** | **3.905 ns** | **0.0148** |     **-** |     **-** |     **576 B** |
| **ResolveAndConsume** |  **Default.Many.Hidden** | **1,352.44 ns** |  **4.362 ns** | **1.556 ns** | **0.0135** |     **-** |     **-** |     **576 B** |
| **ResolveAndConsume** |    **Default.Many.Miss** | **1,346.64 ns** | **13.436 ns** | **7.027 ns** | **0.0135** |     **-** |     **-** |     **576 B** |
| **ResolveAndConsume** |    **Default.Many.Tail** | **1,340.29 ns** | **10.156 ns** | **4.509 ns** | **0.0134** |     **-** |     **-** |     **576 B** |
| **ResolveAndConsume** |      **Default.One.Hit** |   **210.97 ns** |  **4.847 ns** | **2.152 ns** | **0.0151** |     **-** |     **-** |     **576 B** |
| **ResolveAndConsume** | **Deriv(...).Tail [24]** |   **246.11 ns** |  **6.892 ns** | **3.060 ns** | **0.0147** |     **-** |     **-** |     **576 B** |
| **ResolveAndConsume** | **Deriv(...).Tail [25]** |   **246.94 ns** |  **5.443 ns** | **2.417 ns** | **0.0150** |     **-** |     **-** |     **576 B** |
| **ResolveAndConsume** | **Early(...)ation [22]** |    **31.83 ns** |  **0.526 ns** | **0.275 ns** | **0.0003** |     **-** |     **-** |      **24 B** |
