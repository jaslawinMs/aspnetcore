``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F028  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|            Method |                 Case |      Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------------------- |----------:|----------:|---------:|-------:|------:|------:|----------:|
| **ResolveAndConsume** |   **Default.Empty.Miss** | **174.67 ns** | **16.387 ns** | **8.571 ns** | **0.0117** |     **-** |     **-** |     **472 B** |
| **ResolveAndConsume** |    **Default.Four.Tail** | **180.25 ns** |  **4.913 ns** | **2.182 ns** | **0.0110** |     **-** |     **-** |     **472 B** |
| **ResolveAndConsume** |    **Default.Many.Head** | **187.74 ns** |  **2.094 ns** | **0.930 ns** | **0.0125** |     **-** |     **-** |     **472 B** |
| **ResolveAndConsume** |  **Default.Many.Hidden** | **182.01 ns** |  **5.826 ns** | **3.047 ns** | **0.0110** |     **-** |     **-** |     **472 B** |
| **ResolveAndConsume** |    **Default.Many.Miss** | **177.19 ns** |  **8.465 ns** | **3.759 ns** | **0.0123** |     **-** |     **-** |     **472 B** |
| **ResolveAndConsume** |    **Default.Many.Tail** | **182.30 ns** |  **9.012 ns** | **4.001 ns** | **0.0110** |     **-** |     **-** |     **472 B** |
| **ResolveAndConsume** |      **Default.One.Hit** | **180.02 ns** |  **7.028 ns** | **3.676 ns** | **0.0111** |     **-** |     **-** |     **472 B** |
| **ResolveAndConsume** | **Deriv(...).Tail [24]** | **260.19 ns** | **11.648 ns** | **6.092 ns** | **0.0132** |     **-** |     **-** |     **576 B** |
| **ResolveAndConsume** | **Deriv(...).Tail [25]** | **263.05 ns** | **13.770 ns** | **7.202 ns** | **0.0134** |     **-** |     **-** |     **576 B** |
| **ResolveAndConsume** | **Early(...)ation [22]** |  **31.72 ns** |  **0.705 ns** | **0.251 ns** | **0.0003** |     **-** |     **-** |      **24 B** |
