``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F004  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|  Method |       Shape |         Boundary |      Mean |      Error |     StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |------------ |----------------- |----------:|-----------:|-----------:|------:|------:|------:|----------:|
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **2.741 ms** |  **0.6739 ms** |  **0.2992 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.146 ms** |  **0.0915 ms** |  **0.0478 ms** |     **-** |     **-** |     **-** |    **298 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.541 ms** |  **0.2912 ms** |  **0.1523 ms** |     **-** |     **-** |     **-** |    **153 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.354 ms** |  **0.2421 ms** |  **0.1075 ms** |     **-** |     **-** |     **-** |    **340 KB** |
| **Analyze** |    **Nested16** |  **WarmCompilation** | **12.526 ms** |  **1.6677 ms** |  **0.8722 ms** |     **-** |     **-** |     **-** |  **1,132 KB** |
| **Analyze** |    **Nested16** | **FreshCompilation** | **10.516 ms** |  **0.9060 ms** |  **0.4738 ms** |     **-** |     **-** |     **-** |  **1,317 KB** |
| **Analyze** |    **Nested64** |  **WarmCompilation** | **76.014 ms** | **33.1183 ms** | **17.3215 ms** |     **-** |     **-** |     **-** |  **4,676 KB** |
| **Analyze** |    **Nested64** | **FreshCompilation** | **51.725 ms** |  **0.2320 ms** |  **0.1030 ms** |     **-** |     **-** |     **-** |  **4,870 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.123 ms** |  **0.1861 ms** |  **0.0826 ms** |     **-** |     **-** |     **-** |  **2,966 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.710 ms** |  **0.2317 ms** |  **0.1212 ms** |     **-** |     **-** |     **-** |  **3,156 KB** |
