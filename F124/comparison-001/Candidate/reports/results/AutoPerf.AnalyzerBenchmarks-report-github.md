``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F124  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|               Method |         Profile |             Mean |            Error |           StdDev |           Median |  Gen 0 | Gen 1 | Gen 2 |   Allocated |
|--------------------- |---------------- |-----------------:|-----------------:|-----------------:|-----------------:|-------:|------:|------:|------------:|
|            **Predicate** |      **EarlyGuard** |        **285.28 ns** |       **333.315 ns** |       **174.330 ns** |        **401.80 ns** |      **-** |     **-** |     **-** |           **-** |
|   AnalyzeCompilation |      EarlyGuard |  4,098,621.25 ns |   491,848.221 ns |   257,246.130 ns |  4,084,475.00 ns |      - |     - |     - |   104,573 B |
| UnchangedGetLocation |      EarlyGuard |         60.64 ns |        65.325 ns |        34.166 ns |         46.84 ns |      - |     - |     - |        32 B |
|            **Predicate** |    **LargeProgram** |        **321.32 ns** |        **11.038 ns** |         **5.773 ns** |        **319.07 ns** | **0.0032** |     **-** |     **-** |       **168 B** |
|   AnalyzeCompilation |    LargeProgram | 10,304,656.25 ns | 2,045,695.305 ns | 1,069,938.200 ns | 10,083,700.00 ns |      - |     - |     - | 1,308,084 B |
| UnchangedGetLocation |    LargeProgram |         37.97 ns |         1.622 ns |         0.848 ns |         37.81 ns | 0.0008 |     - |     - |        32 B |
|            **Predicate** | **LoneDeclaration** |        **425.72 ns** |        **51.023 ns** |        **26.686 ns** |        **415.12 ns** | **0.0041** |     **-** |     **-** |       **168 B** |
|   AnalyzeCompilation | LoneDeclaration |    990,126.56 ns |    64,166.252 ns |    33,560.191 ns |    990,165.62 ns |      - |     - |     - |    86,993 B |
| UnchangedGetLocation | LoneDeclaration |         33.95 ns |         2.127 ns |         1.112 ns |         33.45 ns | 0.0007 |     - |     - |        32 B |
|            **Predicate** |  **MinimalProgram** |        **323.21 ns** |        **27.671 ns** |        **14.473 ns** |        **319.50 ns** | **0.0032** |     **-** |     **-** |       **168 B** |
|   AnalyzeCompilation |  MinimalProgram |  1,195,237.20 ns |    64,750.236 ns |    33,865.625 ns |  1,195,405.36 ns |      - |     - |     - |   105,398 B |
| UnchangedGetLocation |  MinimalProgram |         34.27 ns |         1.715 ns |         0.897 ns |         34.11 ns | 0.0007 |     - |     - |        32 B |
