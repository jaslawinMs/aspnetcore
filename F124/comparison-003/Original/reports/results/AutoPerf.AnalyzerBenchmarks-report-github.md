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
|            **Predicate** |      **EarlyGuard** |        **279.28 ns** |       **366.237 ns** |       **191.549 ns** |        **399.64 ns** |      **-** |     **-** |     **-** |           **-** |
|   AnalyzeCompilation |      EarlyGuard |  4,115,468.42 ns |   471,459.430 ns |   246,582.398 ns |  4,092,078.95 ns |      - |     - |     - |   104,571 B |
| UnchangedGetLocation |      EarlyGuard |        140.87 ns |       122.921 ns |        64.290 ns |        178.22 ns |      - |     - |     - |        32 B |
|            **Predicate** |    **LargeProgram** |     **78,027.06 ns** |     **3,855.960 ns** |     **2,016.742 ns** |     **77,567.24 ns** |      **-** |     **-** |     **-** |       **117 B** |
|   AnalyzeCompilation |    LargeProgram | 12,595,306.25 ns | 4,245,665.833 ns | 2,220,565.324 ns | 11,645,000.00 ns |      - |     - |     - | 1,306,418 B |
| UnchangedGetLocation |    LargeProgram |         39.19 ns |         2.777 ns |         1.453 ns |         39.23 ns | 0.0008 |     - |     - |        32 B |
|            **Predicate** | **LoneDeclaration** |        **391.60 ns** |        **20.153 ns** |        **10.540 ns** |        **386.88 ns** |      **-** |     **-** |     **-** |       **112 B** |
|   AnalyzeCompilation | LoneDeclaration |    996,709.86 ns |   117,731.247 ns |    61,575.719 ns |  1,000,286.11 ns |      - |     - |     - |    86,830 B |
| UnchangedGetLocation | LoneDeclaration |         33.41 ns |         1.591 ns |         0.832 ns |         33.09 ns | 0.0004 |     - |     - |        32 B |
|            **Predicate** |  **MinimalProgram** |      **2,105.95 ns** |       **137.682 ns** |        **72.010 ns** |      **2,086.45 ns** |      **-** |     **-** |     **-** |       **112 B** |
|   AnalyzeCompilation |  MinimalProgram |  1,181,708.93 ns |    76,322.792 ns |    39,918.296 ns |  1,163,875.00 ns |      - |     - |     - |   105,436 B |
| UnchangedGetLocation |  MinimalProgram |         33.86 ns |         0.579 ns |         0.303 ns |         33.93 ns | 0.0007 |     - |     - |        32 B |
