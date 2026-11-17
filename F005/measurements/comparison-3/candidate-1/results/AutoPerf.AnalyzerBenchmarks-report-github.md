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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **3.026 ms** | **1.1508 ms** | **0.6019 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.281 ms** | **0.2775 ms** | **0.1452 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.779 ms** | **0.3014 ms** | **0.1576 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.556 ms** | **0.2691 ms** | **0.1195 ms** |     **-** |     **-** |     **-** |    **340 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.375 ms** | **0.1117 ms** | **0.0584 ms** |     **-** |     **-** |     **-** |    **223 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.584 ms** | **0.2409 ms** | **0.1069 ms** |     **-** |     **-** |     **-** |    **410 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.511 ms** | **0.1335 ms** | **0.0698 ms** |     **-** |     **-** |     **-** |    **334 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **2.838 ms** | **0.2213 ms** | **0.1157 ms** |     **-** |     **-** |     **-** |    **521 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.065 ms** | **0.1441 ms** | **0.0754 ms** |     **-** |     **-** |     **-** |    **314 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.220 ms** | **0.0573 ms** | **0.0254 ms** |     **-** |     **-** |     **-** |    **509 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.557 ms** | **0.1168 ms** | **0.0611 ms** |     **-** |     **-** |     **-** |    **601 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **2.947 ms** | **0.0222 ms** | **0.0116 ms** |     **-** |     **-** |     **-** |    **789 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.038 ms** | **0.5637 ms** | **0.2503 ms** |     **-** |     **-** |     **-** |  **2,965 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.311 ms** | **0.1897 ms** | **0.0992 ms** |     **-** |     **-** |     **-** |  **3,153 KB** |
| **Analyze** |    **Promoted** |  **WarmCompilation** |  **1.165 ms** | **0.0146 ms** | **0.0076 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** |    **Promoted** | **FreshCompilation** |  **1.613 ms** | **0.0321 ms** | **0.0168 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** |   **Unmutated** |  **WarmCompilation** |  **1.137 ms** | **0.0178 ms** | **0.0093 ms** |     **-** |     **-** |     **-** |    **145 KB** |
| **Analyze** |   **Unmutated** | **FreshCompilation** |  **1.576 ms** | **0.0188 ms** | **0.0098 ms** |     **-** |     **-** |     **-** |    **333 KB** |
