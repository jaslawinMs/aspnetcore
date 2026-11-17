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
| **Authorize** |    **Params2** |   **214.1 ns** |   **6.71 ns** |  **2.98 ns** | **0.0111** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **NoValues** |   **207.1 ns** |  **12.95 ns** |  **5.75 ns** | **0.0120** |     **-** |     **-** |     **456 B** |
| **Authorize** |    **Array64** | **1,675.0 ns** |  **21.11 ns** | **11.04 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |     **List64** | **1,565.9 ns** |  **17.71 ns** |  **9.26 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |       **Set1** |   **206.3 ns** |  **12.25 ns** |  **5.44 ns** | **0.0120** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord16Last** |   **535.7 ns** |  **12.30 ns** |  **6.43 ns** | **0.0107** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Last** |   **509.6 ns** |   **4.83 ns** |  **2.14 ns** | **0.0103** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Def64Last** |   **587.1 ns** |   **9.79 ns** |  **5.12 ns** | **0.0117** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Miss** | **1,573.4 ns** | **142.51 ns** | **63.28 ns** | **0.1496** |     **-** |     **-** |   **5,896 B** |
| **Authorize** | **Ord64Early** |   **209.6 ns** |   **7.00 ns** |  **3.66 ns** | **0.0106** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **Ignore64** | **4,422.2 ns** | **121.71 ns** | **54.04 ns** | **0.1295** |     **-** |     **-** |   **5,896 B** |
