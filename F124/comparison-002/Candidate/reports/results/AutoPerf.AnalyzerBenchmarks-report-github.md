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
|            **Predicate** |      **EarlyGuard** |        **274.41 ns** |       **308.746 ns** |       **161.480 ns** |        **370.67 ns** |      **-** |     **-** |     **-** |           **-** |
|   AnalyzeCompilation |      EarlyGuard |  3,819,186.90 ns |   216,167.315 ns |   113,059.686 ns |  3,802,721.43 ns |      - |     - |     - |   104,368 B |
| UnchangedGetLocation |      EarlyGuard |         49.93 ns |        19.901 ns |        10.409 ns |         46.31 ns |      - |     - |     - |        32 B |
|            **Predicate** |    **LargeProgram** |        **318.51 ns** |         **9.000 ns** |         **4.707 ns** |        **317.28 ns** | **0.0032** |     **-** |     **-** |       **168 B** |
|   AnalyzeCompilation |    LargeProgram | 11,161,656.25 ns | 2,078,800.941 ns | 1,087,253.087 ns | 10,961,237.50 ns |      - |     - |     - | 1,305,742 B |
| UnchangedGetLocation |    LargeProgram |         35.98 ns |         5.679 ns |         2.970 ns |         34.80 ns | 0.0007 |     - |     - |        32 B |
|            **Predicate** | **LoneDeclaration** |        **431.56 ns** |        **41.365 ns** |        **21.635 ns** |        **427.71 ns** | **0.0042** |     **-** |     **-** |       **168 B** |
|   AnalyzeCompilation | LoneDeclaration |  1,210,088.50 ns |    53,730.933 ns |    28,102.317 ns |  1,201,946.67 ns |      - |     - |     - |    86,867 B |
| UnchangedGetLocation | LoneDeclaration |         34.73 ns |         3.498 ns |         1.829 ns |         34.86 ns | 0.0007 |     - |     - |        32 B |
|            **Predicate** |  **MinimalProgram** |        **324.15 ns** |        **10.156 ns** |         **5.312 ns** |        **325.66 ns** | **0.0032** |     **-** |     **-** |       **168 B** |
|   AnalyzeCompilation |  MinimalProgram |  1,295,136.58 ns |   237,373.370 ns |   124,150.862 ns |  1,245,763.24 ns |      - |     - |     - |   105,259 B |
| UnchangedGetLocation |  MinimalProgram |         32.66 ns |         1.685 ns |         0.881 ns |         32.44 ns | 0.0007 |     - |     - |        32 B |
