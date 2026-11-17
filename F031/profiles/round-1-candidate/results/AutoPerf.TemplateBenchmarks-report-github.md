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
| **RenderAndConsume** |  **Display.Completed32** | **31.296 μs** | **16.3026 μs** | **8.5266 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Displ(...)d4096 [21]** | **47.976 μs** |  **6.3334 μs** | **3.3125 μs** |      **-** |     **-** |     **-** |     **77 KB** |
| **RenderAndConsume** |    **Display.Default32** |  **6.254 μs** |  **0.1310 μs** | **0.0685 μs** | **0.3080** |     **-** |     **-** |     **12 KB** |
| **RenderAndConsume** |  **Display.Default4096** | **30.834 μs** |  **0.9682 μs** | **0.5064 μs** | **1.3765** |     **-** |     **-** |     **59 KB** |
| **RenderAndConsume** |   **Editor.Completed32** |  **9.409 μs** |  **3.3762 μs** | **1.7658 μs** |      **-** |     **-** |     **-** |     **13 KB** |
| **RenderAndConsume** | **Editor.Completed4096** | **45.781 μs** |  **6.9870 μs** | **3.6544 μs** |      **-** |     **-** |     **-** |     **77 KB** |
