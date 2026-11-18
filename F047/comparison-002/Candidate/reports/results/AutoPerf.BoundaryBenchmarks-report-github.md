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
| **FreshBoundarySetAndDispose** |    **PrerenderScalar1** | **1,335.8 ns** | **116.38 ns** | **60.87 ns** | **0.0398** |     **-** |     **-** |   **1,560 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar1** |   **430.4 ns** |  **31.55 ns** | **16.50 ns** | **0.0207** |     **-** |     **-** |     **848 B** |
| **FreshBoundarySetAndDispose** |      **PrerenderEmpty** | **1,219.2 ns** |  **48.54 ns** | **25.39 ns** | **0.0245** |     **-** |     **-** |   **1,368 B** |
| **FreshBoundarySetAndDispose** |    **PrerenderScalar4** | **1,642.5 ns** | **129.53 ns** | **67.75 ns** | **0.0459** |     **-** |     **-** |   **1,808 B** |
| **FreshBoundarySetAndDispose** |  **PrerenderFragment1** | **1,512.7 ns** |  **52.17 ns** | **27.29 ns** | **0.0449** |     **-** |     **-** |   **2,104 B** |
| **FreshBoundarySetAndDispose** |     **PrerenderMixed4** | **2,017.7 ns** | **159.04 ns** | **83.18 ns** | **0.0595** |     **-** |     **-** |   **2,680 B** |
| **FreshBoundarySetAndDispose** | **PrerenderFragments8** | **3,431.5 ns** | **157.83 ns** | **82.55 ns** | **0.2028** |     **-** |     **-** |   **5,952 B** |
| **FreshBoundarySetAndDispose** | **NonPrerenderScalar4** |   **584.3 ns** |  **46.38 ns** | **24.26 ns** | **0.0276** |     **-** |     **-** |   **1,096 B** |
