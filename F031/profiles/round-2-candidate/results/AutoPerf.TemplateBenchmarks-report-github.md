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
| **RenderAndConsume** |  **Display.Completed32** | **32.182 μs** | **17.2222 μs** | **9.0075 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Displ(...)d4096 [21]** | **41.348 μs** |  **6.5936 μs** | **3.4486 μs** |      **-** |     **-** |     **-** |     **77 KB** |
| **RenderAndConsume** |    **Display.Default32** |  **6.353 μs** |  **0.1472 μs** | **0.0770 μs** | **0.2608** |     **-** |     **-** |     **12 KB** |
| **RenderAndConsume** |  **Display.Default4096** | **33.981 μs** |  **1.8706 μs** | **0.9784 μs** | **1.5738** |     **-** |     **-** |     **59 KB** |
| **RenderAndConsume** |   **Editor.Completed32** |  **9.663 μs** |  **3.3437 μs** | **1.7488 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Editor.Completed4096** | **40.952 μs** |  **3.3293 μs** | **1.7413 μs** |      **-** |     **-** |     **-** |     **77 KB** |
