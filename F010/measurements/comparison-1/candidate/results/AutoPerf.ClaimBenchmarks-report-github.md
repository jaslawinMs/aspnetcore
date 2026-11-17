``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F010  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|    Method |      Shape |       Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------- |----------- |-----------:|----------:|---------:|-------:|------:|------:|----------:|
| **Authorize** |    **Params2** |   **213.0 ns** |   **4.08 ns** |  **2.13 ns** | **0.0108** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **NoValues** |   **195.6 ns** |   **2.22 ns** |  **0.98 ns** | **0.0121** |     **-** |     **-** |     **456 B** |
| **Authorize** |    **Array64** | **1,595.5 ns** |  **25.46 ns** | **13.32 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |     **List64** | **1,570.3 ns** |  **22.26 ns** |  **9.88 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |       **Set1** |   **210.4 ns** |   **9.07 ns** |  **4.03 ns** | **0.0119** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord16Last** |   **469.4 ns** |   **9.71 ns** |  **4.31 ns** | **0.0094** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Last** |   **478.4 ns** |   **5.88 ns** |  **2.61 ns** | **0.0097** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Def64Last** |   **553.1 ns** |   **7.88 ns** |  **4.12 ns** | **0.0110** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Miss** | **1,747.3 ns** | **173.67 ns** | **90.83 ns** | **0.1435** |     **-** |     **-** |   **5,896 B** |
| **Authorize** | **Ord64Early** |   **207.0 ns** |   **5.04 ns** |  **2.24 ns** | **0.0105** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **Ignore64** | **4,588.7 ns** |  **82.28 ns** | **43.04 ns** | **0.1393** |     **-** |     **-** |   **5,896 B** |
