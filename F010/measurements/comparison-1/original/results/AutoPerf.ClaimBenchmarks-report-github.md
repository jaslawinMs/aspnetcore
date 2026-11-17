``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F010  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|    Method |      Shape |       Mean |    Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------- |----------- |-----------:|---------:|---------:|-------:|------:|------:|----------:|
| **Authorize** |    **Params2** |   **206.1 ns** |  **4.63 ns** |  **2.42 ns** | **0.0103** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **NoValues** |   **190.3 ns** |  **3.83 ns** |  **2.00 ns** | **0.0115** |     **-** |     **-** |     **456 B** |
| **Authorize** |    **Array64** | **1,521.0 ns** | **54.13 ns** | **28.31 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |     **List64** | **1,511.2 ns** | **26.41 ns** | **13.81 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |       **Set1** |   **200.5 ns** |  **4.88 ns** |  **1.74 ns** | **0.0121** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord16Last** |   **899.0 ns** | **19.14 ns** | **10.01 ns** | **0.0090** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Last** | **2,621.3 ns** | **39.18 ns** | **20.49 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Def64Last** | **2,625.4 ns** | **31.09 ns** | **16.26 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Miss** | **3,900.6 ns** | **46.85 ns** | **24.50 ns** | **0.1554** |     **-** |     **-** |   **5,896 B** |
| **Authorize** | **Ord64Early** |   **201.0 ns** |  **7.18 ns** |  **3.19 ns** | **0.0120** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **Ignore64** | **6,293.5 ns** | **79.20 ns** | **35.17 ns** | **0.1264** |     **-** |     **-** |   **5,896 B** |
