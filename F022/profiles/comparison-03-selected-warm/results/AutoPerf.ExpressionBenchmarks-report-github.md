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
| **Exercise** | **Class(...)elper [25]** |      **10.98 ns** |      **0.091 ns** |      **0.041 ns** |      **-** |     **-** |     **-** |         **-** |
| **Exercise** | **Class(...)ntrol [25]** |     **466.16 ns** |      **6.357 ns** |      **2.823 ns** |      **-** |     **-** |     **-** |     **120 B** |
| **Exercise** |  **Model.Array.Control** | **264,786.14 ns** | **32,282.004 ns** | **16,884.112 ns** |      **-** |     **-** |     **-** |  **10,071 B** |
| **Exercise** | **Model(...)eType [25]** | **303,639.90 ns** |  **6,120.097 ns** |  **3,200.929 ns** |      **-** |     **-** |     **-** |  **10,243 B** |
| **Exercise** |  **Model.Indexer.Value** | **313,167.11 ns** |  **7,090.617 ns** |  **3,148.278 ns** |      **-** |     **-** |     **-** |  **10,240 B** |
| **Exercise** | **Model.Member.Control** |     **179.31 ns** |      **2.556 ns** |      **1.337 ns** | **0.0036** |     **-** |     **-** |     **176 B** |
| **Exercise** |   **Name.Array.Control** |  **82,622.37 ns** |  **1,492.456 ns** |    **662.660 ns** |      **-** |     **-** |     **-** |   **5,084 B** |
| **Exercise** | **Name.(...)tured [24]** |  **62,469.54 ns** |    **964.805 ns** |    **504.612 ns** |      **-** |     **-** |     **-** |   **5,059 B** |
| **Exercise** |   **Name.List.Captured** |  **87,066.22 ns** |  **1,083.347 ns** |    **481.013 ns** |      **-** |     **-** |     **-** |   **5,093 B** |
| **Exercise** |   **Name.List.Constant** |  **29,523.12 ns** |    **470.890 ns** |    **246.285 ns** |      **-** |     **-** |     **-** |   **4,514 B** |
| **Exercise** | **Name.(...)ssion [23]** |  **91,649.99 ns** |  **1,393.795 ns** |    **618.854 ns** |      **-** |     **-** |     **-** |   **5,997 B** |
| **Exercise** |  **Name.Member.Control** |      **32.87 ns** |      **0.312 ns** |      **0.163 ns** |      **-** |     **-** |     **-** |         **-** |
| **Exercise** |  **Name.Method.Control** |     **573.81 ns** |      **9.065 ns** |      **4.025 ns** | **0.0058** |     **-** |     **-** |     **232 B** |
| **Exercise** | **Name.(...)exers [23]** | **134,487.04 ns** |  **4,707.482 ns** |  **2,090.151 ns** |      **-** |     **-** |     **-** |   **9,529 B** |
