``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F004  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|  Method |       Shape |         Boundary |      Mean |      Error |     StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |------------ |----------------- |----------:|-----------:|-----------:|------:|------:|------:|----------:|
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **2.957 ms** |  **1.0184 ms** |  **0.5326 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.611 ms** |  **0.1124 ms** |  **0.0499 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.996 ms** |  **0.5976 ms** |  **0.3126 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.639 ms** |  **0.2979 ms** |  **0.1323 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** |    **Nested16** |  **WarmCompilation** | **13.102 ms** |  **0.5994 ms** |  **0.3135 ms** |     **-** |     **-** |     **-** |  **1,111 KB** |
| **Analyze** |    **Nested16** | **FreshCompilation** | **10.503 ms** |  **0.0940 ms** |  **0.0417 ms** |     **-** |     **-** |     **-** |  **1,295 KB** |
| **Analyze** |    **Nested64** |  **WarmCompilation** | **76.980 ms** | **32.7206 ms** | **17.1135 ms** |     **-** |     **-** |     **-** |  **3,842 KB** |
| **Analyze** |    **Nested64** | **FreshCompilation** | **52.042 ms** |  **0.3485 ms** |  **0.1823 ms** |     **-** |     **-** |     **-** |  **4,701 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.034 ms** |  **0.1536 ms** |  **0.0682 ms** |     **-** |     **-** |     **-** |  **2,966 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.830 ms** |  **0.5624 ms** |  **0.2942 ms** |     **-** |     **-** |     **-** |  **3,150 KB** |
