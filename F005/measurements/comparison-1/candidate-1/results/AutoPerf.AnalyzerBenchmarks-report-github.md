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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **2.733 ms** | **0.6284 ms** | **0.2790 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.335 ms** | **0.3829 ms** | **0.2003 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.765 ms** | **0.4213 ms** | **0.2204 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.568 ms** | **0.2037 ms** | **0.0905 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** | **Potential16** |  **WarmCompilation** |  **2.421 ms** | **0.1429 ms** | **0.0748 ms** |     **-** |     **-** |     **-** |    **222 KB** |
| **Analyze** | **Potential16** | **FreshCompilation** |  **3.583 ms** | **0.2322 ms** | **0.1214 ms** |     **-** |     **-** |     **-** |    **409 KB** |
| **Analyze** | **Potential64** |  **WarmCompilation** |  **2.612 ms** | **0.1087 ms** | **0.0569 ms** |     **-** |     **-** |     **-** |    **334 KB** |
| **Analyze** | **Potential64** | **FreshCompilation** |  **2.966 ms** | **0.5020 ms** | **0.2229 ms** |     **-** |     **-** |     **-** |    **521 KB** |
| **Analyze** |  **Promoted16** |  **WarmCompilation** |  **2.396 ms** | **0.3471 ms** | **0.1815 ms** |     **-** |     **-** |     **-** |    **317 KB** |
| **Analyze** |  **Promoted16** | **FreshCompilation** |  **2.301 ms** | **0.1211 ms** | **0.0633 ms** |     **-** |     **-** |     **-** |    **503 KB** |
| **Analyze** |  **Promoted64** |  **WarmCompilation** |  **2.602 ms** | **0.0904 ms** | **0.0401 ms** |     **-** |     **-** |     **-** |    **587 KB** |
| **Analyze** |  **Promoted64** | **FreshCompilation** |  **3.001 ms** | **0.0934 ms** | **0.0488 ms** |     **-** |     **-** |     **-** |    **774 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **11.961 ms** | **0.2015 ms** | **0.0895 ms** |     **-** |     **-** |     **-** |  **2,963 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.471 ms** | **0.3383 ms** | **0.1502 ms** |     **-** |     **-** |     **-** |  **3,153 KB** |
