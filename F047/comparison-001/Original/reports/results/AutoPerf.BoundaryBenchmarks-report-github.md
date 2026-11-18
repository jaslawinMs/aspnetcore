``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F047  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                     Method |             Profile |       Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------------- |-------------------- |-----------:|------------:|------------:|-------:|------:|------:|----------:|
| **FreshBoundarySetAndDispose** |    **PrerenderScalar1** | **2,689.6 ns** | **2,195.02 ns** | **1,148.04 ns** |      **-** |     **-** |     **-** |   **1,616 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar1** |   **452.2 ns** |    **39.31 ns** |    **20.56 ns** | **0.0215** |     **-** |     **-** |     **848 B** |
| **FreshBoundarySetAndDispose** |      **PrerenderEmpty** | **1,269.8 ns** |    **19.28 ns** |    **10.08 ns** | **0.0371** |     **-** |     **-** |   **1,392 B** |
| **FreshBoundarySetAndDispose** |    **PrerenderScalar4** | **1,734.6 ns** |   **490.20 ns** |   **256.39 ns** | **0.0492** |     **-** |     **-** |   **1,888 B** |
| **FreshBoundarySetAndDispose** |  **PrerenderFragment1** | **1,582.1 ns** |   **199.72 ns** |   **104.46 ns** | **0.0462** |     **-** |     **-** |   **2,160 B** |
| **FreshBoundarySetAndDispose** |     **PrerenderMixed4** | **2,009.2 ns** |   **113.21 ns** |    **59.21 ns** | **0.0586** |     **-** |     **-** |   **2,760 B** |
| **FreshBoundarySetAndDispose** | **PrerenderFragments8** | **3,661.8 ns** |    **87.97 ns** |    **46.01 ns** | **0.1422** |     **-** |     **-** |   **6,064 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar4** |   **588.2 ns** |     **7.40 ns** |     **3.87 ns** | **0.0279** |     **-** |     **-** |   **1,096 B** |
