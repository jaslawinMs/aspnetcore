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
| **Authorize** |    **Params2** |   **195.5 ns** |  **4.52 ns** |  **1.61 ns** | **0.0121** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **NoValues** |   **182.1 ns** | **14.99 ns** |  **7.84 ns** | **0.0108** |     **-** |     **-** |     **456 B** |
| **Authorize** |    **Array64** | **1,646.8 ns** |  **5.79 ns** |  **2.06 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |     **List64** | **1,529.3 ns** | **22.63 ns** | **10.05 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |       **Set1** |   **198.2 ns** |  **8.28 ns** |  **3.68 ns** | **0.0121** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord16Last** |   **895.3 ns** |  **8.92 ns** |  **3.96 ns** | **0.0090** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Last** | **2,612.9 ns** | **13.23 ns** |  **6.92 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Def64Last** | **2,613.5 ns** | **20.85 ns** | **10.91 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Miss** | **3,831.3 ns** | **42.37 ns** | **22.16 ns** | **0.1513** |     **-** |     **-** |   **5,896 B** |
| **Authorize** | **Ord64Early** |   **199.7 ns** |  **4.58 ns** |  **2.04 ns** | **0.0119** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **Ignore64** | **6,336.3 ns** | **56.53 ns** | **29.57 ns** | **0.1262** |     **-** |     **-** |   **5,896 B** |
