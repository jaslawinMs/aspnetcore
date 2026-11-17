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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **3.503 ms** | **0.1950 ms** | **0.1020 ms** |     **-** |     **-** |     **-** |    **109 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **5.061 ms** | **0.2012 ms** | **0.1052 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **3.050 ms** | **0.3103 ms** | **0.1378 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.560 ms** | **0.3064 ms** | **0.1603 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.818 ms** | **0.1806 ms** | **0.0945 ms** |     **-** |     **-** |     **-** |    **222 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.756 ms** | **0.4040 ms** | **0.2113 ms** |     **-** |     **-** |     **-** |    **409 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.304 ms** | **0.1598 ms** | **0.0836 ms** |     **-** |     **-** |     **-** |    **332 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **3.548 ms** | **0.6386 ms** | **0.3340 ms** |     **-** |     **-** |     **-** |    **519 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.312 ms** | **0.4068 ms** | **0.2128 ms** |     **-** |     **-** |     **-** |    **321 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.319 ms** | **0.1480 ms** | **0.0774 ms** |     **-** |     **-** |     **-** |    **512 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.627 ms** | **0.1765 ms** | **0.0923 ms** |     **-** |     **-** |     **-** |    **625 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **2.996 ms** | **0.0615 ms** | **0.0322 ms** |     **-** |     **-** |     **-** |    **812 KB** |
| **Analyze** |    **Cached64** |  **WarmCompilation** |  **1.971 ms** | **0.0377 ms** | **0.0197 ms** |     **-** |     **-** |     **-** |    **463 KB** |
| **Analyze** |    **Cached64** | **FreshCompilation** |  **2.403 ms** | **0.0304 ms** | **0.0135 ms** |     **-** |     **-** |     **-** |    **650 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.722 ms** | **0.6276 ms** | **0.3282 ms** |     **-** |     **-** |     **-** |  **2,964 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.854 ms** | **0.2848 ms** | **0.1490 ms** |     **-** |     **-** |     **-** |  **3,151 KB** |
| **Analyze** |    **Promoted** |  **WarmCompilation** |  **1.181 ms** | **0.0115 ms** | **0.0060 ms** |     **-** |     **-** |     **-** |    **151 KB** |
| **Analyze** |    **Promoted** | **FreshCompilation** |  **1.627 ms** | **0.0229 ms** | **0.0120 ms** |     **-** |     **-** |     **-** |    **338 KB** |
| **Analyze** |   **Unmutated** |  **WarmCompilation** |  **1.146 ms** | **0.0311 ms** | **0.0163 ms** |     **-** |     **-** |     **-** |    **144 KB** |
| **Analyze** |   **Unmutated** | **FreshCompilation** |  **1.590 ms** | **0.0303 ms** | **0.0159 ms** |     **-** |     **-** |     **-** |    **332 KB** |
| **Analyze** |      **Cached** |  **WarmCompilation** |  **1.190 ms** | **0.0249 ms** | **0.0130 ms** |     **-** |     **-** |     **-** |    **147 KB** |
| **Analyze** |      **Cached** | **FreshCompilation** |  **1.663 ms** | **0.0431 ms** | **0.0191 ms** |     **-** |     **-** |     **-** |    **334 KB** |
