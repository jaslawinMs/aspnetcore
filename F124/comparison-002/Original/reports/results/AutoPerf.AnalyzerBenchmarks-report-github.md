``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F124  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|               Method |         Profile |             Mean |            Error |         StdDev |           Median |  Gen 0 | Gen 1 | Gen 2 |   Allocated |
|--------------------- |---------------- |-----------------:|-----------------:|---------------:|-----------------:|-------:|------:|------:|------------:|
|            **Predicate** |      **EarlyGuard** |        **251.90 ns** |       **351.168 ns** |     **183.667 ns** |        **302.39 ns** |      **-** |     **-** |     **-** |           **-** |
|   AnalyzeCompilation |      EarlyGuard |  3,995,474.34 ns |   236,370.709 ns | 123,626.451 ns |  4,010,594.74 ns |      - |     - |     - |   104,611 B |
| UnchangedGetLocation |      EarlyGuard |         51.38 ns |         9.831 ns |       5.142 ns |         49.83 ns |      - |     - |     - |        32 B |
|            **Predicate** |    **LargeProgram** |     **74,231.33 ns** |     **1,219.460 ns** |     **637.801 ns** |     **74,064.58 ns** |      **-** |     **-** |     **-** |       **117 B** |
|   AnalyzeCompilation |    LargeProgram | 11,699,093.75 ns | 1,728,387.564 ns | 903,980.116 ns | 11,947,837.50 ns |      - |     - |     - | 1,307,676 B |
| UnchangedGetLocation |    LargeProgram |         41.33 ns |         0.826 ns |       0.432 ns |         41.37 ns | 0.0009 |     - |     - |        32 B |
|            **Predicate** | **LoneDeclaration** |        **366.85 ns** |         **9.948 ns** |       **5.203 ns** |        **365.61 ns** |      **-** |     **-** |     **-** |       **112 B** |
|   AnalyzeCompilation | LoneDeclaration |    922,915.48 ns |    27,660.278 ns |  14,466.860 ns |    926,654.13 ns |      - |     - |     - |    86,836 B |
| UnchangedGetLocation | LoneDeclaration |         35.44 ns |         0.674 ns |       0.352 ns |         35.38 ns | 0.0008 |     - |     - |        32 B |
|            **Predicate** |  **MinimalProgram** |      **1,973.95 ns** |        **32.388 ns** |      **16.940 ns** |      **1,968.02 ns** |      **-** |     **-** |     **-** |       **112 B** |
|   AnalyzeCompilation |  MinimalProgram |  1,189,948.21 ns |    49,321.625 ns |  25,796.163 ns |  1,187,205.95 ns |      - |     - |     - |   105,360 B |
| UnchangedGetLocation |  MinimalProgram |         36.06 ns |         0.827 ns |       0.433 ns |         36.00 ns | 0.0008 |     - |     - |        32 B |
