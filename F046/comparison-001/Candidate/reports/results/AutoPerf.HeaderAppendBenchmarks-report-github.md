``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F046  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                      Method |        ProfileKey |      Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------------- |------------------ |----------:|----------:|----------:|-------:|------:|------:|----------:|
|           **FreshNativeAppend** |        **NoExisting** |  **94.25 ns** | **13.005 ns** |  **6.802 ns** | **0.0101** |     **-** |     **-** |     **384 B** |
| FreshPublicExtensionControl |        NoExisting | 108.76 ns |  5.624 ns |  2.941 ns | 0.0100 |     - |     - |     384 B |
|           **FreshNativeAppend** |         **KeepAlive** | **132.90 ns** |  **6.705 ns** |  **3.507 ns** | **0.0109** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl |         KeepAlive | 169.60 ns | 20.169 ns | 10.549 ns | 0.0101 |     - |     - |     424 B |
|           **FreshNativeAppend** |       **TwoExisting** | **140.73 ns** |  **3.705 ns** |  **1.938 ns** | **0.0115** |     **-** |     **-** |     **432 B** |
| FreshPublicExtensionControl |       TwoExisting | 187.98 ns | 16.985 ns |  8.883 ns | 0.0116 |     - |     - |     432 B |
|           **FreshNativeAppend** |     **EightExisting** | **201.17 ns** | **16.068 ns** |  **8.404 ns** | **0.0118** |     **-** |     **-** |     **480 B** |
| FreshPublicExtensionControl |     EightExisting | 289.22 ns |  6.363 ns |  3.328 ns | 0.0118 |     - |     - |     480 B |
|           **FreshNativeAppend** | **MixedCaseExisting** | **141.07 ns** | **12.294 ns** |  **6.430 ns** | **0.0110** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl | MixedCaseExisting | 180.27 ns |  5.933 ns |  3.103 ns | 0.0110 |     - |     - |     424 B |
|           **FreshNativeAppend** |      **WrappedStore** | **152.05 ns** |  **7.630 ns** |  **3.991 ns** | **0.0120** |     **-** |     **-** |     **456 B** |
| FreshPublicExtensionControl |      WrappedStore | 172.74 ns |  5.388 ns |  2.818 ns | 0.0121 |     - |     - |     456 B |
