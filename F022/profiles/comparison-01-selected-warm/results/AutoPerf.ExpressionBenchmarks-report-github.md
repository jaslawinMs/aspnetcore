``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F022  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|   Method |                 Case |          Mean |         Error |        StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|--------- |--------------------- |--------------:|--------------:|--------------:|-------:|------:|------:|----------:|
| **Exercise** | **Class(...)elper [25]** |      **11.00 ns** |      **0.050 ns** |      **0.018 ns** |      **-** |     **-** |     **-** |         **-** |
| **Exercise** | **Class(...)ntrol [25]** |     **478.33 ns** |      **6.016 ns** |      **2.671 ns** |      **-** |     **-** |     **-** |     **120 B** |
| **Exercise** |  **Model.Array.Control** | **263,065.81 ns** | **30,657.383 ns** | **16,034.404 ns** |      **-** |     **-** |     **-** |  **10,071 B** |
| **Exercise** | **Model(...)adata [22]** | **309,000.61 ns** |  **4,677.701 ns** |  **2,076.928 ns** |      **-** |     **-** |     **-** |  **10,243 B** |
| **Exercise** |  **Model.Indexer.Value** | **321,768.47 ns** |  **8,599.795 ns** |  **4,497.859 ns** |      **-** |     **-** |     **-** |  **10,240 B** |
| **Exercise** | **Model.Member.Control** |     **193.87 ns** |      **2.704 ns** |      **1.414 ns** | **0.0039** |     **-** |     **-** |     **176 B** |
| **Exercise** |   **Name.Array.Control** |  **84,833.18 ns** |  **1,465.149 ns** |    **650.535 ns** |      **-** |     **-** |     **-** |   **5,084 B** |
| **Exercise** | **Name.(...)tured [24]** |  **64,903.87 ns** |  **1,192.917 ns** |    **529.663 ns** |      **-** |     **-** |     **-** |   **5,059 B** |
| **Exercise** |   **Name.List.Captured** |  **89,507.73 ns** |  **3,134.547 ns** |  **1,639.429 ns** |      **-** |     **-** |     **-** |   **5,093 B** |
| **Exercise** |   **Name.List.Constant** |  **31,693.62 ns** |    **646.347 ns** |    **286.982 ns** |      **-** |     **-** |     **-** |   **4,514 B** |
| **Exercise** | **Name.(...)ssion [23]** |  **94,086.43 ns** |  **3,135.991 ns** |  **1,640.184 ns** |      **-** |     **-** |     **-** |   **5,997 B** |
| **Exercise** |  **Name.Member.Control** |      **33.80 ns** |      **0.311 ns** |      **0.163 ns** |      **-** |     **-** |     **-** |         **-** |
| **Exercise** |  **Name.Method.Control** |     **605.60 ns** |     **13.416 ns** |      **7.017 ns** | **0.0060** |     **-** |     **-** |     **232 B** |
| **Exercise** | **Name.(...)exers [23]** | **137,094.45 ns** |  **2,885.652 ns** |  **1,281.247 ns** |      **-** |     **-** |     **-** |   **9,519 B** |
