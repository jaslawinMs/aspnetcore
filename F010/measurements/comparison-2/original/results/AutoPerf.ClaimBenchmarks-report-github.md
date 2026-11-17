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
| **Authorize** |    **Params2** |   **197.0 ns** |   **8.28 ns** |  **3.68 ns** | **0.0121** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **NoValues** |   **180.9 ns** |   **8.43 ns** |  **3.74 ns** | **0.0122** |     **-** |     **-** |     **456 B** |
| **Authorize** |    **Array64** | **1,571.5 ns** |  **17.98 ns** |  **9.41 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |     **List64** | **1,550.0 ns** |  **16.49 ns** |  **5.88 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |       **Set1** |   **184.8 ns** |   **6.07 ns** |  **3.18 ns** | **0.0110** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord16Last** |   **903.3 ns** |  **16.84 ns** |  **8.81 ns** | **0.0090** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Last** | **2,639.5 ns** |  **64.88 ns** | **33.93 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Def64Last** | **2,637.4 ns** |  **52.22 ns** | **23.19 ns** |      **-** |     **-** |     **-** |     **456 B** |
| **Authorize** |  **Ord64Miss** | **3,806.1 ns** |  **55.27 ns** | **28.91 ns** | **0.1545** |     **-** |     **-** |   **5,896 B** |
| **Authorize** | **Ord64Early** |   **185.5 ns** |   **5.38 ns** |  **2.81 ns** | **0.0111** |     **-** |     **-** |     **456 B** |
| **Authorize** |   **Ignore64** | **6,294.2 ns** | **125.52 ns** | **55.73 ns** | **0.1261** |     **-** |     **-** |   **5,896 B** |
