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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **2.562 ms** | **0.1403 ms** | **0.0500 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.390 ms** | **0.5088 ms** | **0.2661 ms** |     **-** |     **-** |     **-** |    **298 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.788 ms** | **0.4707 ms** | **0.2462 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.574 ms** | **0.2952 ms** | **0.1311 ms** |     **-** |     **-** |     **-** |    **340 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.414 ms** | **0.1277 ms** | **0.0668 ms** |     **-** |     **-** |     **-** |    **223 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.605 ms** | **0.2029 ms** | **0.1061 ms** |     **-** |     **-** |     **-** |    **410 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.657 ms** | **0.1642 ms** | **0.0859 ms** |     **-** |     **-** |     **-** |    **336 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **2.888 ms** | **0.2755 ms** | **0.1223 ms** |     **-** |     **-** |     **-** |    **524 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.314 ms** | **0.3352 ms** | **0.1753 ms** |     **-** |     **-** |     **-** |    **325 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.267 ms** | **0.0530 ms** | **0.0236 ms** |     **-** |     **-** |     **-** |    **513 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.748 ms** | **0.1771 ms** | **0.0926 ms** |     **-** |     **-** |     **-** |    **624 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **3.081 ms** | **0.0521 ms** | **0.0272 ms** |     **-** |     **-** |     **-** |    **811 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **11.850 ms** | **0.2757 ms** | **0.1224 ms** |     **-** |     **-** |     **-** |  **2,967 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.317 ms** | **0.2190 ms** | **0.1146 ms** |     **-** |     **-** |     **-** |  **3,153 KB** |
