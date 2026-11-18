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
| **FreshBoundarySetAndDispose** |    **PrerenderScalar1** | **1,324.8 ns** |  **72.74 ns** | **38.04 ns** | **0.0406** |     **-** |     **-** |   **1,560 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar1** |   **461.5 ns** |  **19.14 ns** | **10.01 ns** | **0.0223** |     **-** |     **-** |     **848 B** |
| **FreshBoundarySetAndDispose** |      **PrerenderEmpty** | **1,250.6 ns** |  **55.77 ns** | **29.17 ns** | **0.0364** |     **-** |     **-** |   **1,368 B** |
| **FreshBoundarySetAndDispose** |    **PrerenderScalar4** | **1,802.7 ns** |  **32.26 ns** | **16.87 ns** | **0.0364** |     **-** |     **-** |   **1,808 B** |
| **FreshBoundarySetAndDispose** |  **PrerenderFragment1** | **1,578.8 ns** |  **76.24 ns** | **39.87 ns** | **0.0443** |     **-** |     **-** |   **2,104 B** |
| **FreshBoundarySetAndDispose** |     **PrerenderMixed4** | **2,213.0 ns** | **122.98 ns** | **64.32 ns** | **0.0645** |     **-** |     **-** |   **2,680 B** |
| **FreshBoundarySetAndDispose** | **PrerenderFragments8** | **3,842.7 ns** |  **83.63 ns** | **43.74 ns** | **0.1476** |     **-** |     **-** |   **5,952 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar4** |   **783.5 ns** |  **31.17 ns** | **16.30 ns** | **0.0294** |     **-** |     **-** |   **1,096 B** |
