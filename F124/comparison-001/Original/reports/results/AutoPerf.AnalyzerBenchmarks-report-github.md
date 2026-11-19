``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F124  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|               Method |         Profile |             Mean |            Error |           StdDev |  Gen 0 | Gen 1 | Gen 2 |   Allocated |
|--------------------- |---------------- |-----------------:|-----------------:|-----------------:|-------:|------:|------:|------------:|
|            **Predicate** |      **EarlyGuard** |         **45.85 ns** |         **1.326 ns** |         **0.693 ns** |      **-** |     **-** |     **-** |           **-** |
|   AnalyzeCompilation |      EarlyGuard |  4,282,289.88 ns |   752,543.582 ns |   393,594.845 ns |      - |     - |     - |   104,424 B |
| UnchangedGetLocation |      EarlyGuard |         33.09 ns |         7.583 ns |         3.966 ns | 0.0006 |     - |     - |        32 B |
|            **Predicate** |    **LargeProgram** |     **74,683.69 ns** |       **634.859 ns** |       **332.044 ns** |      **-** |     **-** |     **-** |       **117 B** |
|   AnalyzeCompilation |    LargeProgram | 12,095,912.50 ns | 2,170,332.872 ns | 1,135,126.057 ns |      - |     - |     - | 1,307,760 B |
| UnchangedGetLocation |    LargeProgram |         31.13 ns |         0.749 ns |         0.392 ns | 0.0007 |     - |     - |        32 B |
|            **Predicate** | **LoneDeclaration** |        **374.00 ns** |        **16.907 ns** |         **8.843 ns** |      **-** |     **-** |     **-** |       **112 B** |
|   AnalyzeCompilation | LoneDeclaration |    993,391.54 ns |    59,376.092 ns |    31,054.844 ns |      - |     - |     - |    87,020 B |
| UnchangedGetLocation | LoneDeclaration |         32.49 ns |         1.964 ns |         1.027 ns | 0.0007 |     - |     - |        32 B |
|            **Predicate** |  **MinimalProgram** |      **1,987.10 ns** |        **29.934 ns** |        **15.656 ns** |      **-** |     **-** |     **-** |       **112 B** |
|   AnalyzeCompilation |  MinimalProgram |  1,174,207.87 ns |    51,556.421 ns |    26,965.005 ns |      - |     - |     - |   105,234 B |
| UnchangedGetLocation |  MinimalProgram |         31.21 ns |         1.366 ns |         0.714 ns | 0.0007 |     - |     - |        32 B |
