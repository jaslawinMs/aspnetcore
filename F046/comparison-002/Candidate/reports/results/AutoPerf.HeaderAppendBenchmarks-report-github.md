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
|           **FreshNativeAppend** |        **NoExisting** |  **92.75 ns** |  **8.135 ns** |  **4.255 ns** | **0.0101** |     **-** |     **-** |     **384 B** |
| FreshPublicExtensionControl |        NoExisting | 108.44 ns |  6.719 ns |  3.514 ns | 0.0096 |     - |     - |     384 B |
|           **FreshNativeAppend** |         **KeepAlive** | **132.58 ns** |  **6.758 ns** |  **3.534 ns** | **0.0107** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl |         KeepAlive | 169.88 ns |  8.288 ns |  4.335 ns | 0.0101 |     - |     - |     424 B |
|           **FreshNativeAppend** |       **TwoExisting** | **156.15 ns** | **14.041 ns** |  **7.344 ns** | **0.0115** |     **-** |     **-** |     **432 B** |
| FreshPublicExtensionControl |       TwoExisting | 191.91 ns | 18.195 ns |  9.516 ns | 0.0115 |     - |     - |     432 B |
|           **FreshNativeAppend** |     **EightExisting** | **201.75 ns** | **17.940 ns** |  **9.383 ns** | **0.0119** |     **-** |     **-** |     **480 B** |
| FreshPublicExtensionControl |     EightExisting | 299.80 ns | 15.058 ns |  7.876 ns | 0.0120 |     - |     - |     480 B |
|           **FreshNativeAppend** | **MixedCaseExisting** | **139.15 ns** | **15.248 ns** |  **7.975 ns** | **0.0108** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl | MixedCaseExisting | 186.64 ns | 22.193 ns | 11.607 ns | 0.0110 |     - |     - |     424 B |
|           **FreshNativeAppend** |      **WrappedStore** | **160.11 ns** |  **7.924 ns** |  **4.144 ns** | **0.0111** |     **-** |     **-** |     **456 B** |
| FreshPublicExtensionControl |      WrappedStore | 183.77 ns | 18.085 ns |  9.459 ns | 0.0117 |     - |     - |     456 B |
