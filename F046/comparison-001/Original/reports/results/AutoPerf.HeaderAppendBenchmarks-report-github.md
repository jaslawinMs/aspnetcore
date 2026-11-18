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
|           **FreshNativeAppend** |        **NoExisting** | **104.1 ns** |  **7.30 ns** |  **3.82 ns** | **0.0093** |     **-** |     **-** |     **384 B** |
| FreshPublicExtensionControl |        NoExisting | 107.7 ns |  7.76 ns |  4.06 ns | 0.0098 |     - |     - |     384 B |
|           **FreshNativeAppend** |         **KeepAlive** | **151.1 ns** | **13.53 ns** |  **7.08 ns** | **0.0105** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl |         KeepAlive | 166.3 ns |  9.27 ns |  4.85 ns | 0.0100 |     - |     - |     424 B |
|           **FreshNativeAppend** |       **TwoExisting** | **164.6 ns** | **18.18 ns** |  **9.51 ns** | **0.0114** |     **-** |     **-** |     **432 B** |
| FreshPublicExtensionControl |       TwoExisting | 186.0 ns | 17.73 ns |  9.27 ns | 0.0110 |     - |     - |     432 B |
|           **FreshNativeAppend** |     **EightExisting** | **223.3 ns** | **20.27 ns** | **10.60 ns** | **0.0115** |     **-** |     **-** |     **480 B** |
| FreshPublicExtensionControl |     EightExisting | 293.6 ns |  8.73 ns |  4.57 ns | 0.0117 |     - |     - |     480 B |
|           **FreshNativeAppend** | **MixedCaseExisting** | **163.3 ns** | **10.51 ns** |  **5.50 ns** | **0.0111** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl | MixedCaseExisting | 180.4 ns | 17.00 ns |  8.89 ns | 0.0110 |     - |     - |     424 B |
|           **FreshNativeAppend** |      **WrappedStore** | **156.5 ns** |  **9.09 ns** |  **4.75 ns** | **0.0108** |     **-** |     **-** |     **456 B** |
| FreshPublicExtensionControl |      WrappedStore | 173.9 ns |  5.62 ns |  2.94 ns | 0.0106 |     - |     - |     456 B |
