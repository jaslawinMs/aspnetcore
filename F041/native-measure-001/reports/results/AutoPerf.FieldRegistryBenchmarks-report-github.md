``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F041-OriginalOnly  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|     Method | FieldCount | RegistryState |       Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------- |----------- |-------------- |-----------:|-----------:|-----------:|-------:|------:|------:|----------:|
| **RenderForm** |          **1** |          **Cold** |  **41.205 μs** | **15.8012 μs** |  **8.2643 μs** |      **-** |     **-** |     **-** |     **11 KB** |
| **RenderForm** |          **1** |          **Warm** |   **7.663 μs** |  **0.7964 μs** |  **0.4165 μs** | **0.2191** |     **-** |     **-** |     **10 KB** |
| **RenderForm** |          **8** |          **Cold** |  **23.947 μs** |  **0.7481 μs** |  **0.3913 μs** | **0.6874** |     **-** |     **-** |     **33 KB** |
| **RenderForm** |          **8** |          **Warm** |  **23.974 μs** |  **2.0852 μs** |  **1.0906 μs** | **0.6878** |     **-** |     **-** |     **32 KB** |
| **RenderForm** |         **64** |          **Cold** | **160.856 μs** | **13.4337 μs** |  **7.0261 μs** | **4.6440** |     **-** |     **-** |    **222 KB** |
| **RenderForm** |         **64** |          **Warm** | **158.874 μs** | **24.9442 μs** | **13.0463 μs** | **4.5181** |     **-** |     **-** |    **216 KB** |
