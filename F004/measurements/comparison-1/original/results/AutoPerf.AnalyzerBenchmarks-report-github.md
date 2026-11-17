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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **2.819 ms** |  **0.8784 ms** |  **0.3900 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.498 ms** |  **0.2510 ms** |  **0.1313 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.941 ms** |  **0.0901 ms** |  **0.0471 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.650 ms** |  **0.3467 ms** |  **0.1539 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** |    **Nested16** |  **WarmCompilation** | **12.812 ms** |  **1.8388 ms** |  **0.9617 ms** |     **-** |     **-** |     **-** |  **1,131 KB** |
| **Analyze** |    **Nested16** | **FreshCompilation** | **10.894 ms** |  **1.1410 ms** |  **0.5968 ms** |     **-** |     **-** |     **-** |  **1,315 KB** |
| **Analyze** |    **Nested64** |  **WarmCompilation** | **71.289 ms** | **29.4862 ms** | **15.4219 ms** |     **-** |     **-** |     **-** |  **4,682 KB** |
| **Analyze** |    **Nested64** | **FreshCompilation** | **52.767 ms** |  **0.6667 ms** |  **0.3487 ms** |     **-** |     **-** |     **-** |  **4,869 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.321 ms** |  **0.1870 ms** |  **0.0978 ms** |     **-** |     **-** |     **-** |  **2,964 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.718 ms** |  **0.1167 ms** |  **0.0518 ms** |     **-** |     **-** |     **-** |  **3,154 KB** |
