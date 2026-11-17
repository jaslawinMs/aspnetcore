``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F005  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|  Method |       Shape |         Boundary |      Mean |     Error |    StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |------------ |----------------- |----------:|----------:|----------:|------:|------:|------:|----------:|
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **3.520 ms** | **0.1368 ms** | **0.0607 ms** |     **-** |     **-** |     **-** |    **109 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **4.979 ms** | **0.2561 ms** | **0.1339 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.785 ms** | **0.1683 ms** | **0.0880 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.356 ms** | **0.1714 ms** | **0.0897 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.489 ms** | **0.1820 ms** | **0.0952 ms** |     **-** |     **-** |     **-** |    **222 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.497 ms** | **0.1804 ms** | **0.0944 ms** |     **-** |     **-** |     **-** |    **409 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.350 ms** | **0.1625 ms** | **0.0850 ms** |     **-** |     **-** |     **-** |    **333 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **3.276 ms** | **0.5410 ms** | **0.2830 ms** |     **-** |     **-** |     **-** |    **520 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.314 ms** | **0.3773 ms** | **0.1973 ms** |     **-** |     **-** |     **-** |    **317 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.322 ms** | **0.1097 ms** | **0.0574 ms** |     **-** |     **-** |     **-** |    **501 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.571 ms** | **0.1309 ms** | **0.0685 ms** |     **-** |     **-** |     **-** |    **572 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **2.981 ms** | **0.0356 ms** | **0.0158 ms** |     **-** |     **-** |     **-** |    **759 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **11.987 ms** | **0.2273 ms** | **0.1009 ms** |     **-** |     **-** |     **-** |  **2,959 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **15.630 ms** | **5.4381 ms** | **2.8442 ms** |     **-** |     **-** |     **-** |  **3,147 KB** |
| **Analyze** |    **Promoted** |  **WarmCompilation** |  **1.178 ms** | **0.0178 ms** | **0.0093 ms** |     **-** |     **-** |     **-** |    **151 KB** |
| **Analyze** |    **Promoted** | **FreshCompilation** |  **1.633 ms** | **0.0245 ms** | **0.0128 ms** |     **-** |     **-** |     **-** |    **338 KB** |
| **Analyze** |   **Unmutated** |  **WarmCompilation** |  **1.138 ms** | **0.0132 ms** | **0.0058 ms** |     **-** |     **-** |     **-** |    **145 KB** |
| **Analyze** |   **Unmutated** | **FreshCompilation** |  **1.620 ms** | **0.0550 ms** | **0.0287 ms** |     **-** |     **-** |     **-** |    **332 KB** |
