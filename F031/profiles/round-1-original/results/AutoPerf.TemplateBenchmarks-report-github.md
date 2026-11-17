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
| **RenderAndConsume** |  **Display.Completed32** | **31.726 μs** | **15.9610 μs** | **8.3479 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Displ(...)d4096 [21]** | **49.422 μs** |  **8.7088 μs** | **4.5549 μs** |      **-** |     **-** |     **-** |     **77 KB** |
| **RenderAndConsume** |    **Display.Default32** |  **6.372 μs** |  **0.1220 μs** | **0.0638 μs** | **0.3190** |     **-** |     **-** |     **12 KB** |
| **RenderAndConsume** |  **Display.Default4096** | **33.858 μs** |  **4.3847 μs** | **2.2933 μs** | **1.5244** |     **-** |     **-** |     **59 KB** |
| **RenderAndConsume** |   **Editor.Completed32** | **10.102 μs** |  **3.2281 μs** | **1.6884 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Editor.Completed4096** | **40.349 μs** |  **5.1686 μs** | **2.7033 μs** |      **-** |     **-** |     **-** |     **77 KB** |
