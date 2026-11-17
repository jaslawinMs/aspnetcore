``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F014  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
| Method |               Shape |        Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------- |-------------------- |------------:|----------:|----------:|-------:|------:|------:|----------:|
|   **Send** |    **NoConnections512** |    **107.3 ns** |   **9.78 ns** |   **5.11 ns** | **0.0011** |     **-** |     **-** |      **64 B** |
|   **Send** |        **EmptyTargets** |    **735.3 ns** |   **7.60 ns** |   **3.98 ns** |      **-** |     **-** |     **-** |      **64 B** |
|   **Send** |         **Small4List2** |    **500.5 ns** |   **8.30 ns** |   **3.68 ns** | **0.0051** |     **-** |     **-** |     **312 B** |
|   **Send** |       **C32List64Miss** |  **3,687.2 ns** |  **26.51 ns** |  **13.86 ns** |      **-** |     **-** |     **-** |      **64 B** |
|   **Send** |      **C32Array64Miss** |  **3,249.6 ns** |  **30.42 ns** |  **15.91 ns** |      **-** |     **-** |     **-** |      **64 B** |
|   **Send** |   **C32ReadOnly64Miss** |  **3,946.2 ns** |  **58.16 ns** |  **30.42 ns** |      **-** |     **-** |     **-** |      **64 B** |
|   **Send** |     **C128List256Miss** | **45,463.0 ns** | **691.22 ns** | **361.52 ns** |      **-** |     **-** |     **-** |      **66 B** |
|   **Send** |    **C128Array256Miss** | **37,985.0 ns** | **332.27 ns** | **147.53 ns** |      **-** |     **-** |     **-** |      **66 B** |
|   **Send** |     **C32List64Sparse** |  **4,091.5 ns** |  **50.00 ns** |  **22.20 ns** |      **-** |     **-** |     **-** |     **312 B** |
|   **Send** |    **C32Array64Sparse** |  **3,482.1 ns** |  **22.57 ns** |  **10.02 ns** |      **-** |     **-** |     **-** |     **312 B** |
|   **Send** |        **C32List64All** |  **4,350.5 ns** |  **31.42 ns** |  **16.43 ns** |      **-** |     **-** |     **-** |     **312 B** |
|   **Send** |        **C32DupList64** |  **4,411.8 ns** |  **53.36 ns** |  **27.91 ns** |      **-** |     **-** |     **-** |     **312 B** |
|   **Send** | **C32SharedUserList64** |  **4,280.8 ns** | **198.53 ns** | **103.84 ns** |      **-** |     **-** |     **-** |     **312 B** |
|   **Send** | **C32NullUsersArray64** |  **2,049.0 ns** |  **30.41 ns** |  **13.50 ns** |      **-** |     **-** |     **-** |      **64 B** |
