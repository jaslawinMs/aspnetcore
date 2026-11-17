``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F012-original-only  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
| Method |            Shape |        Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------- |----------------- |------------:|----------:|----------:|-------:|------:|------:|----------:|
|   **Send** | **NoConnections512** |    **100.5 ns** |   **9.11 ns** |   **4.77 ns** | **0.0010** |     **-** |     **-** |      **64 B** |
|   **Send** |         **OneEmpty** |    **351.9 ns** |   **8.17 ns** |   **4.28 ns** | **0.0070** |     **-** |     **-** |     **312 B** |
|   **Send** |      **Small4List2** |    **632.1 ns** |   **7.33 ns** |   **3.83 ns** | **0.0063** |     **-** |     **-** |     **312 B** |
|   **Send** |        **C32List64** |  **5,273.8 ns** |  **46.82 ns** |  **20.79 ns** |      **-** |     **-** |     **-** |     **312 B** |
|   **Send** |       **C32Array64** |  **7,483.7 ns** |  **30.29 ns** |  **13.45 ns** |      **-** |     **-** |     **-** |     **312 B** |
|   **Send** |    **C32ReadOnly64** |  **5,320.2 ns** |  **23.58 ns** |  **12.33 ns** |      **-** |     **-** |     **-** |     **312 B** |
|   **Send** |      **C128List256** | **44,506.2 ns** | **580.46 ns** | **303.59 ns** |      **-** |     **-** |     **-** |     **314 B** |
|   **Send** |     **C128Array256** | **78,245.0 ns** | **422.51 ns** | **220.98 ns** |      **-** |     **-** |     **-** |     **316 B** |
|   **Send** |       **C32AllList** |  **2,860.7 ns** |  **31.61 ns** |  **16.53 ns** |      **-** |     **-** |     **-** |      **64 B** |
|   **Send** |      **C32AllArray** |  **3,433.3 ns** |  **36.99 ns** |  **16.43 ns** |      **-** |     **-** |     **-** |      **64 B** |
|   **Send** |      **C32HalfList** |  **3,504.9 ns** |  **20.39 ns** |   **9.05 ns** |      **-** |     **-** |     **-** |     **312 B** |
|   **Send** |     **C32DupList64** |  **9,964.3 ns** |  **40.69 ns** |  **18.07 ns** |      **-** |     **-** |     **-** |     **313 B** |
