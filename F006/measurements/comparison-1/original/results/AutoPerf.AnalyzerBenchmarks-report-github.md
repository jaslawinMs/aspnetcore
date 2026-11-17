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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **3.315 ms** | **0.8403 ms** | **0.4395 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **5.011 ms** | **0.1685 ms** | **0.0881 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.844 ms** | **0.2894 ms** | **0.1514 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.475 ms** | **0.2144 ms** | **0.1121 ms** |     **-** |     **-** |     **-** |    **340 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.467 ms** | **0.1542 ms** | **0.0807 ms** |     **-** |     **-** |     **-** |    **223 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.466 ms** | **0.1463 ms** | **0.0650 ms** |     **-** |     **-** |     **-** |    **410 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.249 ms** | **0.1032 ms** | **0.0540 ms** |     **-** |     **-** |     **-** |    **336 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **3.026 ms** | **0.1212 ms** | **0.0538 ms** |     **-** |     **-** |     **-** |    **524 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.144 ms** | **0.2148 ms** | **0.1123 ms** |     **-** |     **-** |     **-** |    **319 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.252 ms** | **0.0856 ms** | **0.0380 ms** |     **-** |     **-** |     **-** |    **507 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.612 ms** | **0.0276 ms** | **0.0144 ms** |     **-** |     **-** |     **-** |    **606 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **3.048 ms** | **0.0424 ms** | **0.0222 ms** |     **-** |     **-** |     **-** |    **793 KB** |
| **Analyze** |    **Cached64** |  **WarmCompilation** |  **2.031 ms** | **0.0591 ms** | **0.0262 ms** |     **-** |     **-** |     **-** |    **466 KB** |
| **Analyze** |    **Cached64** | **FreshCompilation** |  **2.473 ms** | **0.0190 ms** | **0.0099 ms** |     **-** |     **-** |     **-** |    **654 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.355 ms** | **0.4249 ms** | **0.1887 ms** |     **-** |     **-** |     **-** |  **2,964 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.931 ms** | **0.1084 ms** | **0.0481 ms** |     **-** |     **-** |     **-** |  **3,153 KB** |
| **Analyze** |    **Promoted** |  **WarmCompilation** |  **1.172 ms** | **0.0138 ms** | **0.0072 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** |    **Promoted** | **FreshCompilation** |  **1.628 ms** | **0.0265 ms** | **0.0138 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** |   **Unmutated** |  **WarmCompilation** |  **1.141 ms** | **0.0282 ms** | **0.0148 ms** |     **-** |     **-** |     **-** |    **145 KB** |
| **Analyze** |   **Unmutated** | **FreshCompilation** |  **1.582 ms** | **0.0249 ms** | **0.0130 ms** |     **-** |     **-** |     **-** |    **332 KB** |
| **Analyze** |      **Cached** |  **WarmCompilation** |  **1.166 ms** | **0.0123 ms** | **0.0055 ms** |     **-** |     **-** |     **-** |    **147 KB** |
| **Analyze** |      **Cached** | **FreshCompilation** |  **1.621 ms** | **0.0287 ms** | **0.0150 ms** |     **-** |     **-** |     **-** |    **335 KB** |
