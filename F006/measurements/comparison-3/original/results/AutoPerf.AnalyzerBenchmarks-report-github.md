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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **2.749 ms** | **0.5611 ms** | **0.2492 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.441 ms** | **0.1697 ms** | **0.0754 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.764 ms** | **0.4471 ms** | **0.2338 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.627 ms** | **0.1693 ms** | **0.0752 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.404 ms** | **0.1197 ms** | **0.0626 ms** |     **-** |     **-** |     **-** |    **223 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.423 ms** | **0.1584 ms** | **0.0703 ms** |     **-** |     **-** |     **-** |    **410 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.560 ms** | **0.0826 ms** | **0.0367 ms** |     **-** |     **-** |     **-** |    **336 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **2.861 ms** | **0.1286 ms** | **0.0672 ms** |     **-** |     **-** |     **-** |    **524 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.043 ms** | **0.1195 ms** | **0.0625 ms** |     **-** |     **-** |     **-** |    **319 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.237 ms** | **0.0577 ms** | **0.0302 ms** |     **-** |     **-** |     **-** |    **511 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.631 ms** | **0.0353 ms** | **0.0157 ms** |     **-** |     **-** |     **-** |    **620 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **3.064 ms** | **0.0342 ms** | **0.0179 ms** |     **-** |     **-** |     **-** |    **807 KB** |
| **Analyze** |    **Cached64** |  **WarmCompilation** |  **2.026 ms** | **0.0276 ms** | **0.0145 ms** |     **-** |     **-** |     **-** |    **467 KB** |
| **Analyze** |    **Cached64** | **FreshCompilation** |  **2.457 ms** | **0.0334 ms** | **0.0175 ms** |     **-** |     **-** |     **-** |    **654 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.398 ms** | **0.2605 ms** | **0.1156 ms** |     **-** |     **-** |     **-** |  **2,965 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.871 ms** | **0.4370 ms** | **0.2285 ms** |     **-** |     **-** |     **-** |  **3,155 KB** |
| **Analyze** |    **Promoted** |  **WarmCompilation** |  **1.164 ms** | **0.0189 ms** | **0.0099 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** |    **Promoted** | **FreshCompilation** |  **1.604 ms** | **0.0150 ms** | **0.0067 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** |   **Unmutated** |  **WarmCompilation** |  **1.133 ms** | **0.0175 ms** | **0.0091 ms** |     **-** |     **-** |     **-** |    **145 KB** |
| **Analyze** |   **Unmutated** | **FreshCompilation** |  **1.588 ms** | **0.0291 ms** | **0.0152 ms** |     **-** |     **-** |     **-** |    **332 KB** |
| **Analyze** |      **Cached** |  **WarmCompilation** |  **1.167 ms** | **0.0205 ms** | **0.0107 ms** |     **-** |     **-** |     **-** |    **148 KB** |
| **Analyze** |      **Cached** | **FreshCompilation** |  **1.614 ms** | **0.0206 ms** | **0.0108 ms** |     **-** |     **-** |     **-** |    **335 KB** |
