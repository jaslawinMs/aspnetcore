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
| **RenderAndConsume** |  **Display.Completed32** | **31.762 μs** | **17.9726 μs** | **9.4000 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Displ(...)d4096 [21]** | **47.757 μs** |  **7.6148 μs** | **3.9827 μs** |      **-** |     **-** |     **-** |     **77 KB** |
| **RenderAndConsume** |    **Display.Default32** |  **6.382 μs** |  **0.2576 μs** | **0.1347 μs** | **0.3224** |     **-** |     **-** |     **12 KB** |
| **RenderAndConsume** |  **Display.Default4096** | **31.697 μs** |  **3.5557 μs** | **1.8597 μs** | **1.3311** |     **-** |     **-** |     **59 KB** |
| **RenderAndConsume** |   **Editor.Completed32** |  **9.418 μs** |  **4.2089 μs** | **2.2013 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Editor.Completed4096** | **46.975 μs** |  **8.4501 μs** | **4.4196 μs** |      **-** |     **-** |     **-** |     **77 KB** |
