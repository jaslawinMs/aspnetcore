``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|             Method |                 Case |          Mean |         Error |        StdDev |   Gen 0 |  Gen 1 |  Gen 2 |   Allocated |
|------------------- |--------------------- |--------------:|--------------:|--------------:|--------:|-------:|-------:|------------:|
| **SerializeOrPersist** |    **DataScalarControl** |     **588.41 ns** |     **43.254 ns** |     **22.623 ns** |  **0.0233** |      **-** |      **-** |     **1,032 B** |
| **SerializeOrPersist** | **DataString16KControl** |  **12,169.79 ns** |  **1,700.783 ns** |    **889.542 ns** |  **3.2710** | **0.2336** |      **-** |   **115,842 B** |
| **SerializeOrPersist** |      **SessionArray256** |   **4,241.84 ns** |    **731.879 ns** |    **382.787 ns** |  **0.2381** |      **-** |      **-** |    **10,120 B** |
| **SerializeOrPersist** | **SessionDictionary256** |  **25,542.21 ns** |  **8,553.421 ns** |  **4,473.605 ns** |  **3.1888** |      **-** |      **-** |   **119,580 B** |
| **SerializeOrPersist** |    **SessionEscaped16K** | **272,557.13 ns** | **43,750.842 ns** | **22,882.536 ns** | **10.4167** | **5.2083** | **5.2083** |   **460,025 B** |
| **SerializeOrPersist** |        **SessionNested** |   **3,112.55 ns** |     **81.795 ns** |     **42.781 ns** |  **0.0927** |      **-** |      **-** |     **4,232 B** |
| **SerializeOrPersist** |          **SessionNull** |      **75.22 ns** |      **6.931 ns** |      **3.625 ns** |  **0.0023** |      **-** |      **-** |        **88 B** |
| **SerializeOrPersist** |        **SessionScalar** |     **410.82 ns** |     **44.716 ns** |     **23.387 ns** |  **0.0266** |      **-** |      **-** |     **1,008 B** |
| **SerializeOrPersist** |    **SessionString128K** | **402,409.24 ns** | **51,380.952 ns** | **26,873.231 ns** |  **7.3529** | **7.3529** | **7.3529** | **1,049,801 B** |
| **SerializeOrPersist** |     **SessionString16K** |  **13,493.14 ns** |  **1,939.433 ns** |  **1,014.361 ns** |  **3.6447** | **0.1350** |      **-** |   **132,282 B** |
| **SerializeOrPersist** |    **SessionUnicode16K** | **348,096.34 ns** | **30,607.170 ns** | **16,008.142 ns** |  **6.5789** | **6.5789** | **6.5789** |   **591,053 B** |
| **SerializeOrPersist** |         **ValueAbove4K** |   **4,248.95 ns** |    **642.804 ns** |    **336.199 ns** |  **0.7622** |      **-** |      **-** |    **29,480 B** |
| **SerializeOrPersist** |        **ValueArray256** |   **3,762.55 ns** |    **721.437 ns** |    **377.325 ns** |  **0.2237** |      **-** |      **-** |     **9,056 B** |
| **SerializeOrPersist** |            **ValueAt4K** |   **4,224.63 ns** |    **761.723 ns** |    **398.396 ns** |  **0.7567** |      **-** |      **-** |    **29,472 B** |
| **SerializeOrPersist** |         **ValueBelow4K** |   **4,504.88 ns** |  **2,031.779 ns** |  **1,062.660 ns** |  **0.7485** |      **-** |      **-** |    **29,464 B** |
| **SerializeOrPersist** |   **ValueDictionary256** |  **24,050.76 ns** |  **8,787.533 ns** |  **4,596.050 ns** |  **2.7174** |      **-** |      **-** |   **105,291 B** |
| **SerializeOrPersist** |     **ValueEmptyString** |     **283.39 ns** |     **79.969 ns** |     **41.825 ns** |  **0.0227** |      **-** |      **-** |       **856 B** |
| **SerializeOrPersist** |            **ValueEnum** |   **1,359.37 ns** |    **267.177 ns** |    **139.738 ns** |  **0.1447** |      **-** |      **-** |     **5,320 B** |
| **SerializeOrPersist** |      **ValueEscaped16K** | **266,245.72 ns** | **31,594.384 ns** | **16,524.474 ns** |  **5.4348** | **2.7174** | **2.7174** |   **387,759 B** |
| **SerializeOrPersist** |          **ValueNested** |   **2,962.40 ns** |    **264.274 ns** |    **138.220 ns** |  **0.0906** |      **-** |      **-** |     **3,592 B** |
| **SerializeOrPersist** |            **ValueNull** |     **172.48 ns** |     **31.741 ns** |     **16.601 ns** |  **0.0214** |      **-** |      **-** |       **824 B** |
| **SerializeOrPersist** |   **ValueNullableEnums** |   **1,642.82 ns** |    **325.964 ns** |    **170.485 ns** |  **0.1354** |      **-** |      **-** |     **5,448 B** |
| **SerializeOrPersist** |          **ValueScalar** |     **259.41 ns** |     **34.529 ns** |     **18.059 ns** |  **0.0221** |      **-** |      **-** |       **856 B** |
| **SerializeOrPersist** |      **ValueString128K** | **343,442.35 ns** | **52,070.067 ns** | **27,233.652 ns** |  **6.5789** | **6.5789** | **6.5789** |   **918,558 B** |
| **SerializeOrPersist** |       **ValueString16K** |  **12,377.80 ns** |  **2,525.724 ns** |  **1,321.002 ns** |  **3.3542** | **0.2236** |      **-** |   **115,745 B** |
| **SerializeOrPersist** |        **ValueString1K** |   **1,552.44 ns** |    **261.550 ns** |    **136.795 ns** |  **0.2381** |      **-** |      **-** |     **9,240 B** |
| **SerializeOrPersist** |     **ValueStringSmall** |     **267.23 ns** |     **27.604 ns** |     **14.437 ns** |  **0.0211** |      **-** |      **-** |       **872 B** |
| **SerializeOrPersist** |      **ValueUnicode16K** | **313,534.34 ns** | **16,804.374 ns** |  **8,789.013 ns** |  **6.2500** | **6.2500** | **6.2500** |   **492,603 B** |
