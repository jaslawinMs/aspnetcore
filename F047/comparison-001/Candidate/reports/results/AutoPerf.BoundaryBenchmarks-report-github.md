``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F047  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                     Method |             Profile |       Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------------------------- |-------------------- |-----------:|----------:|----------:|-------:|------:|------:|----------:|
| **FreshBoundarySetAndDispose** |    **PrerenderScalar1** | **1,312.4 ns** |  **42.40 ns** |  **22.18 ns** | **0.0384** |     **-** |     **-** |   **1,560 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar1** |   **441.3 ns** |  **38.07 ns** |  **19.91 ns** | **0.0218** |     **-** |     **-** |     **848 B** |
| **FreshBoundarySetAndDispose** |      **PrerenderEmpty** | **1,209.0 ns** |  **26.54 ns** |  **13.88 ns** | **0.0353** |     **-** |     **-** |   **1,368 B** |
| **FreshBoundarySetAndDispose** |    **PrerenderScalar4** | **1,713.9 ns** |  **46.72 ns** |  **24.44 ns** | **0.0344** |     **-** |     **-** |   **1,808 B** |
| **FreshBoundarySetAndDispose** |  **PrerenderFragment1** | **1,480.6 ns** |  **35.25 ns** |  **18.43 ns** | **0.0457** |     **-** |     **-** |   **2,104 B** |
| **FreshBoundarySetAndDispose** |     **PrerenderMixed4** | **2,162.3 ns** | **222.03 ns** | **116.13 ns** | **0.0645** |     **-** |     **-** |   **2,680 B** |
| **FreshBoundarySetAndDispose** | **PrerenderFragments8** | **3,715.2 ns** | **112.83 ns** |  **59.01 ns** | **0.2270** |     **-** |     **-** |   **5,952 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar4** |   **745.0 ns** |  **22.46 ns** |  **11.75 ns** | **0.0289** |     **-** |     **-** |   **1,096 B** |
