``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F046  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                      Method |        ProfileKey |     Mean |    Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------------- |------------------ |---------:|---------:|---------:|-------:|------:|------:|----------:|
|           **FreshNativeAppend** |        **NoExisting** | **111.5 ns** |  **6.30 ns** |  **3.30 ns** | **0.0101** |     **-** |     **-** |     **384 B** |
| FreshPublicExtensionControl |        NoExisting | 112.4 ns |  8.61 ns |  4.50 ns | 0.0092 |     - |     - |     384 B |
|           **FreshNativeAppend** |         **KeepAlive** | **169.6 ns** | **43.66 ns** | **22.83 ns** | **0.0109** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl |         KeepAlive | 234.1 ns | 53.82 ns | 28.15 ns | 0.0113 |     - |     - |     424 B |
|           **FreshNativeAppend** |       **TwoExisting** | **169.4 ns** | **13.52 ns** |  **7.07 ns** | **0.0114** |     **-** |     **-** |     **432 B** |
| FreshPublicExtensionControl |       TwoExisting | 197.4 ns | 14.26 ns |  7.46 ns | 0.0112 |     - |     - |     432 B |
|           **FreshNativeAppend** |     **EightExisting** | **225.8 ns** | **13.04 ns** |  **6.82 ns** | **0.0112** |     **-** |     **-** |     **480 B** |
| FreshPublicExtensionControl |     EightExisting | 302.9 ns | 20.47 ns | 10.71 ns | 0.0119 |     - |     - |     480 B |
|           **FreshNativeAppend** | **MixedCaseExisting** | **167.1 ns** |  **7.34 ns** |  **3.84 ns** | **0.0100** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl | MixedCaseExisting | 183.6 ns |  7.62 ns |  3.99 ns | 0.0107 |     - |     - |     424 B |
|           **FreshNativeAppend** |      **WrappedStore** | **171.3 ns** | **19.65 ns** | **10.28 ns** | **0.0111** |     **-** |     **-** |     **456 B** |
| FreshPublicExtensionControl |      WrappedStore | 179.2 ns | 20.21 ns | 10.57 ns | 0.0116 |     - |     - |     456 B |
