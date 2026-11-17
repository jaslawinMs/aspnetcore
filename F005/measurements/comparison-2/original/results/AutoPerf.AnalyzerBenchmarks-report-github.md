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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **3.528 ms** | **0.1055 ms** | **0.0468 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **4.949 ms** | **0.1947 ms** | **0.1019 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.884 ms** | **0.6389 ms** | **0.3341 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.339 ms** | **0.1604 ms** | **0.0839 ms** |     **-** |     **-** |     **-** |    **340 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.459 ms** | **0.1431 ms** | **0.0748 ms** |     **-** |     **-** |     **-** |    **223 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.450 ms** | **0.1745 ms** | **0.0913 ms** |     **-** |     **-** |     **-** |    **410 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.287 ms** | **0.1368 ms** | **0.0716 ms** |     **-** |     **-** |     **-** |    **336 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **3.262 ms** | **0.4799 ms** | **0.2131 ms** |     **-** |     **-** |     **-** |    **524 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.352 ms** | **0.4256 ms** | **0.2226 ms** |     **-** |     **-** |     **-** |    **324 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.341 ms** | **0.0794 ms** | **0.0415 ms** |     **-** |     **-** |     **-** |    **512 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.681 ms** | **0.1721 ms** | **0.0900 ms** |     **-** |     **-** |     **-** |    **634 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **3.014 ms** | **0.0180 ms** | **0.0064 ms** |     **-** |     **-** |     **-** |    **821 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **11.977 ms** | **0.2231 ms** | **0.1167 ms** |     **-** |     **-** |     **-** |  **2,967 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.529 ms** | **0.4886 ms** | **0.2556 ms** |     **-** |     **-** |     **-** |  **3,150 KB** |
| **Analyze** |    **Promoted** |  **WarmCompilation** |  **1.181 ms** | **0.0127 ms** | **0.0045 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** |    **Promoted** | **FreshCompilation** |  **1.639 ms** | **0.0126 ms** | **0.0056 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** |   **Unmutated** |  **WarmCompilation** |  **1.145 ms** | **0.0145 ms** | **0.0076 ms** |     **-** |     **-** |     **-** |    **145 KB** |
| **Analyze** |   **Unmutated** | **FreshCompilation** |  **1.599 ms** | **0.0227 ms** | **0.0101 ms** |     **-** |     **-** |     **-** |    **332 KB** |
