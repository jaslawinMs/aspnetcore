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
| **Authorize** |    **Params2** |   **199.5 ns** |   **8.92 ns** |  **3.96 ns** | **0.0121** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **NoValues** |   **189.2 ns** |   **5.79 ns** |  **3.03 ns** | **0.0113** |     **-** |     **-** |     **456 B** |
| **Authorize** |    **Array64** | **1,518.4 ns** |  **16.88 ns** |  **7.49 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |     **List64** | **1,553.1 ns** |  **23.61 ns** | **10.48 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |       **Set1** |   **196.3 ns** |   **9.01 ns** |  **4.71 ns** | **0.0116** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord16Last** |   **466.3 ns** |  **10.04 ns** |  **5.25 ns** | **0.0094** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Last** |   **482.9 ns** |   **5.09 ns** |  **1.81 ns** | **0.0097** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Def64Last** |   **590.7 ns** |   **5.72 ns** |  **2.54 ns** | **0.0118** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Miss** | **1,633.9 ns** | **104.68 ns** | **54.75 ns** | **0.1461** |     **-** |     **-** |   **5,896 B** |
| **Authorize** | **Ord64Early** |   **202.4 ns** |   **8.34 ns** |  **3.70 ns** | **0.0105** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **Ignore64** | **4,496.4 ns** |  **94.77 ns** | **49.57 ns** | **0.1362** |     **-** |     **-** |   **5,896 B** |
