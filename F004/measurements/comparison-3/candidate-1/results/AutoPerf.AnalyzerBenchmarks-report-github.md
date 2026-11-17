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
| **Analyze** |     **NoLoops** |  **WarmCompilation** |  **3.123 ms** |  **0.7585 ms** |  **0.3967 ms** |     **-** |     **-** |     **-** |    **110 KB** |
| **Analyze** |     **NoLoops** | **FreshCompilation** |  **3.504 ms** |  **0.2692 ms** |  **0.1408 ms** |     **-** |     **-** |     **-** |    **297 KB** |
| **Analyze** | **OneIterator** |  **WarmCompilation** |  **2.943 ms** |  **0.0824 ms** |  **0.0366 ms** |     **-** |     **-** |     **-** |    **152 KB** |
| **Analyze** | **OneIterator** | **FreshCompilation** |  **3.451 ms** |  **0.2160 ms** |  **0.1130 ms** |     **-** |     **-** |     **-** |    **339 KB** |
| **Analyze** |    **Nested16** |  **WarmCompilation** | **15.619 ms** |  **2.0234 ms** |  **1.0583 ms** |     **-** |     **-** |     **-** |  **1,118 KB** |
| **Analyze** |    **Nested16** | **FreshCompilation** | **12.165 ms** |  **2.4166 ms** |  **1.2639 ms** |     **-** |     **-** |     **-** |  **1,296 KB** |
| **Analyze** |    **Nested64** |  **WarmCompilation** | **85.721 ms** | **20.9812 ms** | **10.9736 ms** |     **-** |     **-** |     **-** |  **4,066 KB** |
| **Analyze** |    **Nested64** | **FreshCompilation** | **50.901 ms** |  **0.7629 ms** |  **0.3990 ms** |     **-** |     **-** |     **-** |  **4,702 KB** |
| **Analyze** |   **NonRender** |  **WarmCompilation** | **12.172 ms** |  **0.2770 ms** |  **0.1449 ms** |     **-** |     **-** |     **-** |  **2,966 KB** |
| **Analyze** |   **NonRender** | **FreshCompilation** | **12.708 ms** |  **0.4434 ms** |  **0.2319 ms** |     **-** |     **-** |     **-** |  **3,154 KB** |
