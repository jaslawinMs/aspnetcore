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
| **FreshBoundarySetAndDispose** |    **PrerenderScalar1** | **1,306.1 ns** |  **70.04 ns** | **36.63 ns** | **0.0400** |     **-** |     **-** |   **1,616 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar1** |   **448.0 ns** |  **15.12 ns** |  **7.91 ns** | **0.0226** |     **-** |     **-** |     **848 B** |
| **FreshBoundarySetAndDispose** |      **PrerenderEmpty** | **1,236.1 ns** | **156.10 ns** | **81.64 ns** | **0.0369** |     **-** |     **-** |   **1,392 B** |
| **FreshBoundarySetAndDispose** |    **PrerenderScalar4** | **1,802.8 ns** |  **64.17 ns** | **33.56 ns** | **0.0365** |     **-** |     **-** |   **1,888 B** |
| **FreshBoundarySetAndDispose** |  **PrerenderFragment1** | **1,525.2 ns** |  **42.75 ns** | **22.36 ns** | **0.0485** |     **-** |     **-** |   **2,160 B** |
| **FreshBoundarySetAndDispose** |     **PrerenderMixed4** | **2,245.2 ns** | **134.24 ns** | **70.21 ns** | **0.0673** |     **-** |     **-** |   **2,760 B** |
| **FreshBoundarySetAndDispose** | **PrerenderFragments8** | **3,947.9 ns** | **161.64 ns** | **84.54 ns** | **0.1562** |     **-** |     **-** |   **6,064 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar4** |   **734.3 ns** |  **33.89 ns** | **17.72 ns** | **0.0220** |     **-** |     **-** |   **1,096 B** |
