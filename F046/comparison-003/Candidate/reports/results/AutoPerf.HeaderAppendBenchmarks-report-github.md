``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F046  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                      Method |        ProfileKey |      Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------------------- |------------------ |----------:|----------:|---------:|-------:|------:|------:|----------:|
|           **FreshNativeAppend** |        **NoExisting** |  **92.30 ns** |  **6.649 ns** | **3.477 ns** | **0.0097** |     **-** |     **-** |     **384 B** |
| FreshPublicExtensionControl |        NoExisting | 113.58 ns |  4.589 ns | 2.400 ns | 0.0098 |     - |     - |     384 B |
|           **FreshNativeAppend** |         **KeepAlive** | **142.87 ns** | **10.354 ns** | **5.415 ns** | **0.0112** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl |         KeepAlive | 176.59 ns | 16.761 ns | 8.766 ns | 0.0110 |     - |     - |     424 B |
|           **FreshNativeAppend** |       **TwoExisting** | **137.88 ns** |  **3.720 ns** | **1.946 ns** | **0.0102** |     **-** |     **-** |     **432 B** |
| FreshPublicExtensionControl |       TwoExisting | 193.06 ns | 16.861 ns | 8.818 ns | 0.0112 |     - |     - |     432 B |
|           **FreshNativeAppend** |     **EightExisting** | **204.00 ns** |  **5.770 ns** | **3.018 ns** | **0.0123** |     **-** |     **-** |     **480 B** |
| FreshPublicExtensionControl |     EightExisting | 295.99 ns |  5.405 ns | 2.827 ns | 0.0118 |     - |     - |     480 B |
|           **FreshNativeAppend** | **MixedCaseExisting** | **135.25 ns** |  **5.813 ns** | **3.041 ns** | **0.0100** |     **-** |     **-** |     **424 B** |
| FreshPublicExtensionControl | MixedCaseExisting | 184.90 ns | 13.783 ns | 7.209 ns | 0.0109 |     - |     - |     424 B |
|           **FreshNativeAppend** |      **WrappedStore** | **159.38 ns** | **13.599 ns** | **7.113 ns** | **0.0122** |     **-** |     **-** |     **456 B** |
| FreshPublicExtensionControl |      WrappedStore | 171.75 ns |  6.321 ns | 3.306 ns | 0.0107 |     - |     - |     456 B |
