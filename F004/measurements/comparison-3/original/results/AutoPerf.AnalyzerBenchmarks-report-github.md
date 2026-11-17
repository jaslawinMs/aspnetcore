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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **3.252 ms** |  **0.5835 ms** |  **0.3052 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.366 ms** |  **0.2486 ms** |  **0.1300 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.916 ms** |  **0.1857 ms** |  **0.0971 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.474 ms** |  **0.1344 ms** |  **0.0703 ms** |     **-** |     **-** |     **-** |    **340 KB** |
| **Analyze** |    **Nested16** |  **WarmCompilation** | **15.273 ms** |  **1.8052 ms** |  **0.9442 ms** |     **-** |     **-** |     **-** |  **1,140 KB** |
| **Analyze** |    **Nested16** | **FreshCompilation** | **11.907 ms** |  **1.8110 ms** |  **0.9472 ms** |     **-** |     **-** |     **-** |  **1,318 KB** |
| **Analyze** |    **Nested64** |  **WarmCompilation** | **80.254 ms** | **30.7177 ms** | **16.0659 ms** |     **-** |     **-** |     **-** |  **4,003 KB** |
| **Analyze** |    **Nested64** | **FreshCompilation** | **51.630 ms** |  **0.4410 ms** |  **0.2306 ms** |     **-** |     **-** |     **-** |  **4,870 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.115 ms** |  **0.1438 ms** |  **0.0638 ms** |     **-** |     **-** |     **-** |  **2,967 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.926 ms** |  **0.4770 ms** |  **0.2118 ms** |     **-** |     **-** |     **-** |  **3,156 KB** |
