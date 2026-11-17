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
| **Exercise** | **Class(...)elper [25]** |   **1,624.53 ns** |     **72.785 ns** |     **38.068 ns** |      **-** |     **-** |     **-** |     **568 B** |
| **Exercise** | **Class(...)ntrol [25]** |     **471.14 ns** |      **5.881 ns** |      **3.076 ns** |      **-** |     **-** |     **-** |     **120 B** |
| **Exercise** |  **Model.Array.Control** | **262,672.61 ns** | **27,799.461 ns** | **14,539.656 ns** |      **-** |     **-** |     **-** |  **10,072 B** |
| **Exercise** | **Model(...)adata [22]** | **348,266.34 ns** |  **9,614.354 ns** |  **5,028.493 ns** |      **-** |     **-** |     **-** |  **11,380 B** |
| **Exercise** |  **Model.Indexer.Value** | **340,870.69 ns** |  **9,724.315 ns** |  **5,086.005 ns** |      **-** |     **-** |     **-** |  **11,381 B** |
| **Exercise** | **Model.Member.Control** |     **192.27 ns** |      **4.085 ns** |      **2.137 ns** | **0.0039** |     **-** |     **-** |     **176 B** |
| **Exercise** |   **Name.Array.Control** |  **84,070.59 ns** |  **2,230.656 ns** |  **1,166.676 ns** |      **-** |     **-** |     **-** |   **5,084 B** |
| **Exercise** | **Name.(...)tured [24]** |  **72,747.14 ns** |  **2,862.585 ns** |  **1,497.187 ns** |      **-** |     **-** |     **-** |   **5,700 B** |
| **Exercise** |   **Name.List.Captured** |  **94,728.15 ns** |  **2,017.912 ns** |  **1,055.407 ns** |      **-** |     **-** |     **-** |   **5,654 B** |
| **Exercise** |   **Name.List.Constant** |  **35,272.80 ns** |    **983.503 ns** |    **514.391 ns** |      **-** |     **-** |     **-** |   **5,082 B** |
| **Exercise** | **Name.(...)ssion [23]** | **102,679.05 ns** |  **3,796.014 ns** |  **1,985.388 ns** |      **-** |     **-** |     **-** |   **6,566 B** |
| **Exercise** |  **Name.Member.Control** |      **35.78 ns** |      **0.566 ns** |      **0.296 ns** |      **-** |     **-** |     **-** |         **-** |
| **Exercise** |  **Name.Method.Control** |     **611.60 ns** |     **12.025 ns** |      **5.339 ns** | **0.0060** |     **-** |     **-** |     **232 B** |
| **Exercise** | **Name.(...)exers [23]** | **149,347.02 ns** |  **3,105.851 ns** |  **1,379.017 ns** |      **-** |     **-** |     **-** |  **10,657 B** |
