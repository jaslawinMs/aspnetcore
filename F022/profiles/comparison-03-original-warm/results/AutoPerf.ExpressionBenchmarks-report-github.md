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
| **Exercise** | **Class(...)elper [25]** |   **1,524.04 ns** |     **21.844 ns** |      **7.790 ns** |      **-** |     **-** |     **-** |     **568 B** |
| **Exercise** | **Class(...)ntrol [25]** |     **463.32 ns** |      **7.489 ns** |      **3.917 ns** |      **-** |     **-** |     **-** |     **120 B** |
| **Exercise** |  **Model.Array.Control** | **248,975.68 ns** | **40,258.503 ns** | **21,055.975 ns** |      **-** |     **-** |     **-** |  **10,096 B** |
| **Exercise** | **Model(...)eType [25]** | **339,916.37 ns** |  **5,935.861 ns** |  **3,104.570 ns** |      **-** |     **-** |     **-** |  **11,380 B** |
| **Exercise** |  **Model.Indexer.Value** | **335,925.46 ns** |  **6,152.323 ns** |  **3,217.784 ns** |      **-** |     **-** |     **-** |  **11,380 B** |
| **Exercise** | **Model.Member.Control** |     **184.96 ns** |      **2.347 ns** |      **1.228 ns** | **0.0037** |     **-** |     **-** |     **176 B** |
| **Exercise** |   **Name.Array.Control** |  **81,472.39 ns** |  **1,983.599 ns** |  **1,037.461 ns** |      **-** |     **-** |     **-** |   **5,084 B** |
| **Exercise** | **Name.(...)tured [24]** |  **68,184.59 ns** |  **1,155.624 ns** |    **604.414 ns** |      **-** |     **-** |     **-** |   **5,700 B** |
| **Exercise** |   **Name.List.Captured** |  **93,043.17 ns** |    **635.857 ns** |    **332.566 ns** |      **-** |     **-** |     **-** |   **5,661 B** |
| **Exercise** |   **Name.List.Constant** |  **32,195.27 ns** |    **625.332 ns** |    **327.061 ns** |      **-** |     **-** |     **-** |   **5,082 B** |
| **Exercise** | **Name.(...)ssion [23]** | **103,308.15 ns** | **13,034.385 ns** |  **6,817.235 ns** |      **-** |     **-** |     **-** |   **6,566 B** |
| **Exercise** |  **Name.Member.Control** |      **34.00 ns** |      **0.512 ns** |      **0.227 ns** |      **-** |     **-** |     **-** |         **-** |
| **Exercise** |  **Name.Method.Control** |     **585.81 ns** |      **6.784 ns** |      **3.012 ns** | **0.0059** |     **-** |     **-** |     **232 B** |
| **Exercise** | **Name.(...)exers [23]** | **143,957.28 ns** |  **6,558.895 ns** |  **3,430.429 ns** |      **-** |     **-** |     **-** |  **10,656 B** |
