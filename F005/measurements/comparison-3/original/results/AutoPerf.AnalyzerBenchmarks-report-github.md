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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **2.937 ms** | **1.0065 ms** | **0.5264 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.683 ms** | **0.1574 ms** | **0.0823 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **3.477 ms** | **0.5513 ms** | **0.2884 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.833 ms** | **0.2625 ms** | **0.1165 ms** |     **-** |     **-** |     **-** |    **340 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.629 ms** | **0.3038 ms** | **0.1349 ms** |     **-** |     **-** |     **-** |    **224 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.549 ms** | **0.2205 ms** | **0.1154 ms** |     **-** |     **-** |     **-** |    **410 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.751 ms** | **0.2189 ms** | **0.1145 ms** |     **-** |     **-** |     **-** |    **336 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **3.573 ms** | **0.7190 ms** | **0.3761 ms** |     **-** |     **-** |     **-** |    **524 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.423 ms** | **0.3558 ms** | **0.1861 ms** |     **-** |     **-** |     **-** |    **324 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.313 ms** | **0.0998 ms** | **0.0522 ms** |     **-** |     **-** |     **-** |    **508 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.681 ms** | **0.1724 ms** | **0.0902 ms** |     **-** |     **-** |     **-** |    **606 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **3.016 ms** | **0.0235 ms** | **0.0105 ms** |     **-** |     **-** |     **-** |    **793 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **11.700 ms** | **0.1125 ms** | **0.0499 ms** |     **-** |     **-** |     **-** |  **2,967 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.198 ms** | **0.2950 ms** | **0.1310 ms** |     **-** |     **-** |     **-** |  **3,152 KB** |
| **Analyze** |    **Promoted** |  **WarmCompilation** |  **1.181 ms** | **0.0112 ms** | **0.0050 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** |    **Promoted** | **FreshCompilation** |  **1.633 ms** | **0.0267 ms** | **0.0140 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** |   **Unmutated** |  **WarmCompilation** |  **1.151 ms** | **0.0206 ms** | **0.0108 ms** |     **-** |     **-** |     **-** |    **145 KB** |
| **Analyze** |   **Unmutated** | **FreshCompilation** |  **1.595 ms** | **0.0472 ms** | **0.0210 ms** |     **-** |     **-** |     **-** |    **332 KB** |
