``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F124  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|               Method |         Profile |             Mean |            Error |         StdDev |  Gen 0 | Gen 1 | Gen 2 |   Allocated |
|--------------------- |---------------- |-----------------:|-----------------:|---------------:|-------:|------:|------:|------------:|
|            **Predicate** |      **EarlyGuard** |         **46.52 ns** |         **0.658 ns** |       **0.344 ns** |      **-** |     **-** |     **-** |           **-** |
|   AnalyzeCompilation |      EarlyGuard |  4,334,822.92 ns |   884,917.044 ns | 462,828.725 ns |      - |     - |     - |   104,372 B |
| UnchangedGetLocation |      EarlyGuard |         30.32 ns |         0.860 ns |       0.450 ns | 0.0005 |     - |     - |        32 B |
|            **Predicate** |    **LargeProgram** |        **294.81 ns** |         **3.456 ns** |       **1.808 ns** | **0.0029** |     **-** |     **-** |       **168 B** |
|   AnalyzeCompilation |    LargeProgram | 11,183,728.12 ns | 1,593,468.344 ns | 833,414.755 ns |      - |     - |     - | 1,307,922 B |
| UnchangedGetLocation |    LargeProgram |         30.83 ns |         2.390 ns |       1.250 ns | 0.0007 |     - |     - |        32 B |
|            **Predicate** | **LoneDeclaration** |        **399.68 ns** |        **46.997 ns** |      **24.580 ns** | **0.0038** |     **-** |     **-** |       **168 B** |
|   AnalyzeCompilation | LoneDeclaration |    945,620.71 ns |    81,345.396 ns |  42,545.215 ns |      - |     - |     - |    86,987 B |
| UnchangedGetLocation | LoneDeclaration |         31.90 ns |         1.900 ns |       0.994 ns | 0.0007 |     - |     - |        32 B |
|            **Predicate** |  **MinimalProgram** |        **300.92 ns** |        **14.938 ns** |       **7.813 ns** | **0.0029** |     **-** |     **-** |       **168 B** |
|   AnalyzeCompilation |  MinimalProgram |  1,146,812.21 ns |    72,510.423 ns |  37,924.353 ns |      - |     - |     - |   105,132 B |
| UnchangedGetLocation |  MinimalProgram |         30.31 ns |         0.782 ns |       0.409 ns | 0.0007 |     - |     - |        32 B |
