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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **2.475 ms** |  **0.4398 ms** |  **0.1953 ms** |     **-** |     **-** |     **-** |    **109 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.366 ms** |  **0.2891 ms** |  **0.1512 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.694 ms** |  **0.5392 ms** |  **0.2820 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.532 ms** |  **0.1650 ms** |  **0.0732 ms** |     **-** |     **-** |     **-** |    **340 KB** |
| **Analyze** |    **Nested16** |  **WarmCompilation** | **11.394 ms** |  **2.4609 ms** |  **1.2871 ms** |     **-** |     **-** |     **-** |  **1,118 KB** |
| **Analyze** |    **Nested16** | **FreshCompilation** | **10.372 ms** |  **1.2003 ms** |  **0.6278 ms** |     **-** |     **-** |     **-** |  **1,302 KB** |
| **Analyze** |    **Nested64** |  **WarmCompilation** | **72.777 ms** | **29.6739 ms** | **15.5200 ms** |     **-** |     **-** |     **-** |  **4,210 KB** |
| **Analyze** |    **Nested64** | **FreshCompilation** | **51.570 ms** |  **0.6226 ms** |  **0.2765 ms** |     **-** |     **-** |     **-** |  **4,766 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.289 ms** |  **0.1894 ms** |  **0.0841 ms** |     **-** |     **-** |     **-** |  **2,964 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.749 ms** |  **0.2304 ms** |  **0.1023 ms** |     **-** |     **-** |     **-** |  **3,155 KB** |
