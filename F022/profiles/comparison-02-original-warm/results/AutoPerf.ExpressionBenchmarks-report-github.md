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
| **Exercise** | **Class(...)elper [25]** |   **1,526.33 ns** |     **16.042 ns** |      **8.390 ns** |      **-** |     **-** |     **-** |     **568 B** |
| **Exercise** | **Class(...)ntrol [25]** |     **470.20 ns** |      **5.099 ns** |      **2.264 ns** |      **-** |     **-** |     **-** |     **120 B** |
| **Exercise** |  **Model.Array.Control** | **264,682.88 ns** | **34,953.623 ns** | **18,281.421 ns** |      **-** |     **-** |     **-** |  **10,061 B** |
| **Exercise** | **Model(...)eType [25]** | **327,959.36 ns** |  **6,398.650 ns** |  **3,346.617 ns** |      **-** |     **-** |     **-** |  **11,383 B** |
| **Exercise** |  **Model.Indexer.Value** | **342,697.03 ns** |  **6,815.402 ns** |  **3,564.587 ns** |      **-** |     **-** |     **-** |  **11,383 B** |
| **Exercise** | **Model.Member.Control** |     **193.10 ns** |      **2.393 ns** |      **1.062 ns** | **0.0040** |     **-** |     **-** |     **176 B** |
| **Exercise** |   **Name.Array.Control** |  **80,493.31 ns** |  **1,887.175 ns** |    **837.917 ns** |      **-** |     **-** |     **-** |   **5,084 B** |
| **Exercise** | **Name.(...)tured [24]** |  **68,051.84 ns** |  **1,356.337 ns** |    **602.222 ns** |      **-** |     **-** |     **-** |   **5,700 B** |
| **Exercise** |   **Name.List.Captured** |  **91,923.88 ns** |    **743.272 ns** |    **330.017 ns** |      **-** |     **-** |     **-** |   **5,653 B** |
| **Exercise** |   **Name.List.Constant** |  **32,052.32 ns** |    **334.432 ns** |    **148.490 ns** |      **-** |     **-** |     **-** |   **5,084 B** |
| **Exercise** | **Name.(...)ssion [23]** |  **95,759.32 ns** |  **2,357.122 ns** |  **1,232.820 ns** |      **-** |     **-** |     **-** |   **6,566 B** |
| **Exercise** |  **Name.Member.Control** |      **36.91 ns** |      **6.173 ns** |      **2.741 ns** |      **-** |     **-** |     **-** |         **-** |
| **Exercise** |  **Name.Method.Control** |     **621.12 ns** |      **7.652 ns** |      **4.002 ns** |      **-** |     **-** |     **-** |     **232 B** |
| **Exercise** | **Name.(...)exers [23]** | **142,403.20 ns** |  **4,548.650 ns** |  **2,019.629 ns** |      **-** |     **-** |     **-** |  **10,656 B** |
