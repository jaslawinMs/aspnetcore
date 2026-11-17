``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F031  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|           Method |              Profile |      Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |--------------------- |----------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **RenderAndConsume** |  **Display.Completed32** | **31.436 μs** | **19.7839 μs** | **10.3473 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Displ(...)d4096 [21]** | **48.780 μs** | **10.6748 μs** |  **5.5831 μs** |      **-** |     **-** |     **-** |     **77 KB** |
| **RenderAndConsume** |    **Display.Default32** |  **6.550 μs** |  **0.1318 μs** |  **0.0689 μs** | **0.3202** |     **-** |     **-** |     **12 KB** |
| **RenderAndConsume** |  **Display.Default4096** | **31.884 μs** |  **0.8735 μs** |  **0.4569 μs** | **1.6276** |     **-** |     **-** |     **59 KB** |
| **RenderAndConsume** |   **Editor.Completed32** |  **9.693 μs** |  **3.9516 μs** |  **2.0668 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Editor.Completed4096** | **49.325 μs** | **11.6993 μs** |  **6.1190 μs** |      **-** |     **-** |     **-** |     **77 KB** |
