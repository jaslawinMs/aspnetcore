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
|           **FreshNativeAppend** |        **NoExisting** | **106.6 ns** | **11.81 ns** |  **6.18 ns** | **0.0094** |     **-** |     **-** |     **384 B** |
| FreshPublicExtensionControl |        NoExisting | 112.3 ns | 13.96 ns |  7.30 ns | 0.0096 |     - |     - |     384 B |
|           **FreshNativeAppend** |         **KeepAlive** | **156.3 ns** | **11.10 ns** |  **5.81 ns** | **0.0107** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl |         KeepAlive | 179.4 ns |  9.20 ns |  4.81 ns | 0.0110 |     - |     - |     424 B |
|           **FreshNativeAppend** |       **TwoExisting** | **170.9 ns** | **11.35 ns** |  **5.93 ns** | **0.0113** |     **-** |     **-** |     **432 B** |
| FreshPublicExtensionControl |       TwoExisting | 200.2 ns | 17.49 ns |  9.15 ns | 0.0116 |     - |     - |     432 B |
|           **FreshNativeAppend** |     **EightExisting** | **223.0 ns** | **10.03 ns** |  **5.25 ns** | **0.0113** |     **-** |     **-** |     **480 B** |
| FreshPublicExtensionControl |     EightExisting | 305.1 ns | 31.00 ns | 16.21 ns | 0.0122 |     - |     - |     480 B |
|           **FreshNativeAppend** | **MixedCaseExisting** | **164.4 ns** | **14.17 ns** |  **7.41 ns** | **0.0114** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl | MixedCaseExisting | 190.1 ns | 13.66 ns |  7.14 ns | 0.0111 |     - |     - |     424 B |
|           **FreshNativeAppend** |      **WrappedStore** | **155.8 ns** |  **5.66 ns** |  **2.96 ns** | **0.0110** |     **-** |     **-** |     **456 B** |
| FreshPublicExtensionControl |      WrappedStore | 180.8 ns | 13.23 ns |  6.92 ns | 0.0121 |     - |     - |     456 B |
