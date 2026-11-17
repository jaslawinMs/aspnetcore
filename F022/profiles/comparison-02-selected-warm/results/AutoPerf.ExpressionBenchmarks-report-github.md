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
| **Exercise** | **Class(...)elper [25]** |      **11.00 ns** |      **0.114 ns** |      **0.050 ns** |      **-** |     **-** |     **-** |         **-** |
| **Exercise** | **Class(...)ntrol [25]** |     **479.08 ns** |     **14.029 ns** |      **7.337 ns** |      **-** |     **-** |     **-** |     **120 B** |
| **Exercise** |  **Model.Array.Control** | **248,432.54 ns** | **81,739.154 ns** | **42,751.158 ns** |      **-** |     **-** |     **-** |  **10,070 B** |
| **Exercise** | **Model(...)eType [25]** | **315,789.67 ns** | **12,955.707 ns** |  **6,776.085 ns** |      **-** |     **-** |     **-** |  **10,241 B** |
| **Exercise** |  **Model.Indexer.Value** | **329,795.74 ns** |  **9,144.755 ns** |  **4,782.884 ns** |      **-** |     **-** |     **-** |  **10,243 B** |
| **Exercise** | **Model.Member.Control** |     **188.97 ns** |      **2.748 ns** |      **1.220 ns** | **0.0040** |     **-** |     **-** |     **176 B** |
| **Exercise** |   **Name.Array.Control** |  **81,149.66 ns** |  **1,158.364 ns** |    **514.321 ns** |      **-** |     **-** |     **-** |   **5,084 B** |
| **Exercise** | **Name.(...)tured [24]** |  **62,740.12 ns** |  **1,281.342 ns** |    **568.924 ns** |      **-** |     **-** |     **-** |   **5,059 B** |
| **Exercise** |   **Name.List.Captured** |  **83,116.48 ns** |  **3,368.596 ns** |  **1,761.841 ns** |      **-** |     **-** |     **-** |   **5,092 B** |
| **Exercise** |   **Name.List.Constant** |  **29,620.00 ns** |    **423.410 ns** |    **187.997 ns** |      **-** |     **-** |     **-** |   **4,514 B** |
| **Exercise** | **Name.(...)ssion [23]** |  **90,058.42 ns** |  **2,367.434 ns** |  **1,051.156 ns** |      **-** |     **-** |     **-** |   **5,997 B** |
| **Exercise** |  **Name.Member.Control** |      **34.02 ns** |      **0.584 ns** |      **0.259 ns** |      **-** |     **-** |     **-** |         **-** |
| **Exercise** |  **Name.Method.Control** |     **594.49 ns** |      **7.388 ns** |      **3.280 ns** | **0.0060** |     **-** |     **-** |     **232 B** |
| **Exercise** | **Name.(...)exers [23]** | **129,808.72 ns** |  **3,107.303 ns** |  **1,625.180 ns** |      **-** |     **-** |     **-** |   **9,519 B** |
