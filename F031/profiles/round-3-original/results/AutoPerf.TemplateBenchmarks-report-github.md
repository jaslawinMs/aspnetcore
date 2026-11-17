``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F031  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|           Method |              Profile |      Mean |      Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |--------------------- |----------:|-----------:|----------:|-------:|------:|------:|----------:|
| **RenderAndConsume** |  **Display.Completed32** | **33.868 μs** | **11.6474 μs** | **6.0918 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Displ(...)d4096 [21]** | **51.668 μs** | **10.9674 μs** | **5.7362 μs** |      **-** |     **-** |     **-** |     **77 KB** |
| **RenderAndConsume** |    **Display.Default32** |  **6.276 μs** |  **0.5478 μs** | **0.2865 μs** | **0.3218** |     **-** |     **-** |     **12 KB** |
| **RenderAndConsume** |  **Display.Default4096** | **31.458 μs** |  **1.1219 μs** | **0.5868 μs** | **1.5808** |     **-** |     **-** |     **59 KB** |
| **RenderAndConsume** |   **Editor.Completed32** |  **9.375 μs** |  **3.6373 μs** | **1.9024 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Editor.Completed4096** | **48.759 μs** |  **9.0718 μs** | **4.7447 μs** |      **-** |     **-** |     **-** |     **77 KB** |
