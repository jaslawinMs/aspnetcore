``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F047  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                     Method |             Profile |       Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------------- |-------------------- |-----------:|----------:|---------:|-------:|------:|------:|----------:|
| **FreshBoundarySetAndDispose** |    **PrerenderScalar1** | **1,303.5 ns** |  **33.56 ns** | **17.55 ns** | **0.0386** |     **-** |     **-** |   **1,616 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar1** |   **443.8 ns** |  **37.83 ns** | **19.79 ns** | **0.0218** |     **-** |     **-** |     **848 B** |
| **FreshBoundarySetAndDispose** |      **PrerenderEmpty** | **1,248.2 ns** |  **72.85 ns** | **38.10 ns** | **0.0367** |     **-** |     **-** |   **1,392 B** |
| **FreshBoundarySetAndDispose** |    **PrerenderScalar4** | **1,746.9 ns** |  **61.85 ns** | **32.35 ns** | **0.0351** |     **-** |     **-** |   **1,888 B** |
| **FreshBoundarySetAndDispose** |  **PrerenderFragment1** | **1,530.8 ns** |  **75.08 ns** | **39.27 ns** | **0.0471** |     **-** |     **-** |   **2,160 B** |
| **FreshBoundarySetAndDispose** |     **PrerenderMixed4** | **2,204.0 ns** | **138.82 ns** | **72.60 ns** | **0.0648** |     **-** |     **-** |   **2,760 B** |
| **FreshBoundarySetAndDispose** | **PrerenderFragments8** | **3,733.4 ns** |  **79.14 ns** | **41.39 ns** | **0.1499** |     **-** |     **-** |   **6,064 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar4** |   **769.2 ns** | **189.97 ns** | **99.36 ns** | **0.0222** |     **-** |     **-** |   **1,096 B** |
