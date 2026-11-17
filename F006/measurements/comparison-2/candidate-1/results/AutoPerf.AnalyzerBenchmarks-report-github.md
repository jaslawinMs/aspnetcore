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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **2.626 ms** | **0.4529 ms** | **0.2011 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.443 ms** | **0.2681 ms** | **0.1402 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.814 ms** | **0.4562 ms** | **0.2386 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.670 ms** | **0.3546 ms** | **0.1574 ms** |     **-** |     **-** |     **-** |    **340 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.506 ms** | **0.1935 ms** | **0.1012 ms** |     **-** |     **-** |     **-** |    **223 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.656 ms** | **0.2535 ms** | **0.1326 ms** |     **-** |     **-** |     **-** |    **410 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.562 ms** | **0.1442 ms** | **0.0640 ms** |     **-** |     **-** |     **-** |    **333 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **3.159 ms** | **0.7026 ms** | **0.3675 ms** |     **-** |     **-** |     **-** |    **520 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.126 ms** | **0.1909 ms** | **0.0998 ms** |     **-** |     **-** |     **-** |    **317 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.226 ms** | **0.0339 ms** | **0.0151 ms** |     **-** |     **-** |     **-** |    **512 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.581 ms** | **0.0619 ms** | **0.0324 ms** |     **-** |     **-** |     **-** |    **626 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **3.000 ms** | **0.0430 ms** | **0.0225 ms** |     **-** |     **-** |     **-** |    **813 KB** |
| **Analyze** |    **Cached64** |  **WarmCompilation** |  **1.953 ms** | **0.0423 ms** | **0.0221 ms** |     **-** |     **-** |     **-** |    **463 KB** |
| **Analyze** |    **Cached64** | **FreshCompilation** |  **2.385 ms** | **0.0341 ms** | **0.0178 ms** |     **-** |     **-** |     **-** |    **651 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.121 ms** | **0.2302 ms** | **0.1022 ms** |     **-** |     **-** |     **-** |  **2,964 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.608 ms** | **0.1952 ms** | **0.0866 ms** |     **-** |     **-** |     **-** |  **3,156 KB** |
| **Analyze** |    **Promoted** |  **WarmCompilation** |  **1.165 ms** | **0.0184 ms** | **0.0096 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** |    **Promoted** | **FreshCompilation** |  **1.609 ms** | **0.0288 ms** | **0.0128 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** |   **Unmutated** |  **WarmCompilation** |  **1.126 ms** | **0.0199 ms** | **0.0088 ms** |     **-** |     **-** |     **-** |    **145 KB** |
| **Analyze** |   **Unmutated** | **FreshCompilation** |  **1.569 ms** | **0.0153 ms** | **0.0080 ms** |     **-** |     **-** |     **-** |    **333 KB** |
| **Analyze** |      **Cached** |  **WarmCompilation** |  **1.199 ms** | **0.0506 ms** | **0.0265 ms** |     **-** |     **-** |     **-** |    **148 KB** |
| **Analyze** |      **Cached** | **FreshCompilation** |  **1.607 ms** | **0.0265 ms** | **0.0139 ms** |     **-** |     **-** |     **-** |    **335 KB** |
