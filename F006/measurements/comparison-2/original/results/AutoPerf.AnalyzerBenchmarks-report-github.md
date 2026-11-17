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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **3.348 ms** | **0.6203 ms** | **0.3244 ms** |     **-** |     **-** |     **-** |    **109 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **4.896 ms** | **0.1703 ms** | **0.0891 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.920 ms** | **0.3349 ms** | **0.1752 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.487 ms** | **0.2224 ms** | **0.0987 ms** |     **-** |     **-** |     **-** |    **340 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.369 ms** | **0.1766 ms** | **0.0924 ms** |     **-** |     **-** |     **-** |    **223 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.360 ms** | **0.1407 ms** | **0.0736 ms** |     **-** |     **-** |     **-** |    **410 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.302 ms** | **0.1762 ms** | **0.0921 ms** |     **-** |     **-** |     **-** |    **336 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **2.832 ms** | **0.0603 ms** | **0.0268 ms** |     **-** |     **-** |     **-** |    **524 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.070 ms** | **0.1737 ms** | **0.0908 ms** |     **-** |     **-** |     **-** |    **319 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.247 ms** | **0.0860 ms** | **0.0450 ms** |     **-** |     **-** |     **-** |    **507 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.614 ms** | **0.0216 ms** | **0.0077 ms** |     **-** |     **-** |     **-** |    **606 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **3.038 ms** | **0.0285 ms** | **0.0127 ms** |     **-** |     **-** |     **-** |    **793 KB** |
| **Analyze** |    **Cached64** |  **WarmCompilation** |  **2.006 ms** | **0.0226 ms** | **0.0118 ms** |     **-** |     **-** |     **-** |    **467 KB** |
| **Analyze** |    **Cached64** | **FreshCompilation** |  **2.444 ms** | **0.0361 ms** | **0.0189 ms** |     **-** |     **-** |     **-** |    **655 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.133 ms** | **0.3225 ms** | **0.1687 ms** |     **-** |     **-** |     **-** |  **2,968 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.671 ms** | **0.1555 ms** | **0.0690 ms** |     **-** |     **-** |     **-** |  **3,158 KB** |
| **Analyze** |    **Promoted** |  **WarmCompilation** |  **1.171 ms** | **0.0173 ms** | **0.0090 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** |    **Promoted** | **FreshCompilation** |  **1.617 ms** | **0.0168 ms** | **0.0088 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** |   **Unmutated** |  **WarmCompilation** |  **1.129 ms** | **0.0057 ms** | **0.0025 ms** |     **-** |     **-** |     **-** |    **145 KB** |
| **Analyze** |   **Unmutated** | **FreshCompilation** |  **1.579 ms** | **0.0180 ms** | **0.0094 ms** |     **-** |     **-** |     **-** |    **332 KB** |
| **Analyze** |      **Cached** |  **WarmCompilation** |  **1.174 ms** | **0.0215 ms** | **0.0113 ms** |     **-** |     **-** |     **-** |    **148 KB** |
| **Analyze** |      **Cached** | **FreshCompilation** |  **1.620 ms** | **0.0264 ms** | **0.0138 ms** |     **-** |     **-** |     **-** |    **335 KB** |
