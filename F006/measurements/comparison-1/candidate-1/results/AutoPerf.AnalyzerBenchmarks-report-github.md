``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F006  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|  Method |       Shape |         Boundary |      Mean |     Error |    StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |------------ |----------------- |----------:|----------:|----------:|------:|------:|------:|----------:|
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **3.285 ms** | **0.7280 ms** | **0.3808 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **5.019 ms** | **0.2331 ms** | **0.1219 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **3.569 ms** | **1.5180 ms** | **0.7940 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.590 ms** | **0.1500 ms** | **0.0784 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.598 ms** | **0.1677 ms** | **0.0877 ms** |     **-** |     **-** |     **-** |    **222 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.523 ms** | **0.0977 ms** | **0.0511 ms** |     **-** |     **-** |     **-** |    **409 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.561 ms** | **0.1273 ms** | **0.0565 ms** |     **-** |     **-** |     **-** |    **332 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **3.644 ms** | **0.3400 ms** | **0.1510 ms** |     **-** |     **-** |     **-** |    **519 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.532 ms** | **0.1473 ms** | **0.0770 ms** |     **-** |     **-** |     **-** |    **328 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.422 ms** | **0.1074 ms** | **0.0562 ms** |     **-** |     **-** |     **-** |    **504 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.739 ms** | **0.1747 ms** | **0.0776 ms** |     **-** |     **-** |     **-** |    **596 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **3.013 ms** | **0.0374 ms** | **0.0195 ms** |     **-** |     **-** |     **-** |    **784 KB** |
| **Analyze** |    **Cached64** |  **WarmCompilation** |  **1.972 ms** | **0.0312 ms** | **0.0163 ms** |     **-** |     **-** |     **-** |    **462 KB** |
| **Analyze** |    **Cached64** | **FreshCompilation** |  **2.419 ms** | **0.0206 ms** | **0.0092 ms** |     **-** |     **-** |     **-** |    **650 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.128 ms** | **0.2294 ms** | **0.1018 ms** |     **-** |     **-** |     **-** |  **2,966 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.737 ms** | **0.2715 ms** | **0.1420 ms** |     **-** |     **-** |     **-** |  **3,153 KB** |
| **Analyze** |    **Promoted** |  **WarmCompilation** |  **1.172 ms** | **0.0129 ms** | **0.0057 ms** |     **-** |     **-** |     **-** |    **151 KB** |
| **Analyze** |    **Promoted** | **FreshCompilation** |  **1.610 ms** | **0.0320 ms** | **0.0114 ms** |     **-** |     **-** |     **-** |    **338 KB** |
| **Analyze** |   **Unmutated** |  **WarmCompilation** |  **1.131 ms** | **0.0114 ms** | **0.0051 ms** |     **-** |     **-** |     **-** |    **144 KB** |
| **Analyze** |   **Unmutated** | **FreshCompilation** |  **1.613 ms** | **0.0317 ms** | **0.0166 ms** |     **-** |     **-** |     **-** |    **332 KB** |
| **Analyze** |      **Cached** |  **WarmCompilation** |  **1.173 ms** | **0.0139 ms** | **0.0073 ms** |     **-** |     **-** |     **-** |    **147 KB** |
| **Analyze** |      **Cached** | **FreshCompilation** |  **1.624 ms** | **0.0320 ms** | **0.0167 ms** |     **-** |     **-** |     **-** |    **334 KB** |
