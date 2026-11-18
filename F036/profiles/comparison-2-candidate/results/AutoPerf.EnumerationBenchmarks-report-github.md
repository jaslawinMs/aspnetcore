``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F036-SourceComparison  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                    Method | Count |          Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------------------- |------ |--------------:|------------:|------------:|-------:|------:|------:|----------:|
|          **TopLevelConcrete** |     **0** |     **1.4623 ns** |   **0.1900 ns** |   **0.0994 ns** |      **-** |     **-** |     **-** |         **-** |
|         TopLevelInterface |     0 |     1.3638 ns |   0.0348 ns |   0.0182 ns |      - |     - |     - |         - |
|             TypedConcrete |     0 |     1.6408 ns |   0.0245 ns |   0.0128 ns |      - |     - |     - |         - |
|                  ReadCopy |     0 |     8.6553 ns |   0.5096 ns |   0.2665 ns |      - |     - |     - |         - |
|                NestedCopy |     0 |    26.5937 ns |   1.2127 ns |   0.6343 ns |      - |     - |     - |         - |
|          MaterializedCopy |     0 |    11.4392 ns |   0.6091 ns |   0.3186 ns |      - |     - |     - |         - |
|                NonGeneric |     0 |     1.1011 ns |   0.0489 ns |   0.0256 ns |      - |     - |     - |         - |
| DictionaryConcreteControl |     0 |     0.3589 ns |   0.0501 ns |   0.0262 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **1** |    **44.1955 ns** |   **0.6790 ns** |   **0.3551 ns** | **0.0014** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     1 |    43.5925 ns |   1.6577 ns |   0.8670 ns | 0.0014 |     - |     - |      56 B |
|             TypedConcrete |     1 |    44.7409 ns |   2.0003 ns |   1.0462 ns | 0.0014 |     - |     - |      56 B |
|                  ReadCopy |     1 |    49.5905 ns |   5.9284 ns |   3.1007 ns | 0.0010 |     - |     - |      56 B |
|                NestedCopy |     1 |    65.7238 ns |   1.0502 ns |   0.5493 ns | 0.0013 |     - |     - |      56 B |
|          MaterializedCopy |     1 |    50.8562 ns |   4.7868 ns |   2.5036 ns | 0.0016 |     - |     - |      56 B |
|                NonGeneric |     1 |    56.1500 ns |   2.2569 ns |   1.1804 ns | 0.0023 |     - |     - |      88 B |
| DictionaryConcreteControl |     1 |     3.6228 ns |   0.2379 ns |   0.1244 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **8** |   **183.6514 ns** |   **2.0604 ns** |   **1.0776 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     8 |   177.8331 ns |   2.4238 ns |   1.2677 ns |      - |     - |     - |      56 B |
|             TypedConcrete |     8 |   177.7388 ns |   3.2550 ns |   1.7024 ns |      - |     - |     - |      56 B |
|                  ReadCopy |     8 |   186.3198 ns |   4.0837 ns |   2.1358 ns |      - |     - |     - |      56 B |
|                NestedCopy |     8 |   202.1809 ns |   2.7744 ns |   1.4511 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |     8 |   188.9081 ns |   4.6918 ns |   2.4539 ns |      - |     - |     - |      56 B |
|                NonGeneric |     8 |   286.0355 ns |  25.9027 ns |  13.5476 ns | 0.0056 |     - |     - |     312 B |
| DictionaryConcreteControl |     8 |    45.5893 ns |   1.6323 ns |   0.8537 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |    **64** | **1,207.7305 ns** |  **16.4804 ns** |   **8.6196 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |    64 | 1,193.7511 ns |  24.7003 ns |  12.9188 ns |      - |     - |     - |      56 B |
|             TypedConcrete |    64 | 1,180.3147 ns |  27.5504 ns |  14.4094 ns |      - |     - |     - |      56 B |
|                  ReadCopy |    64 | 1,187.0853 ns |  24.7374 ns |  12.9381 ns |      - |     - |     - |      56 B |
|                NestedCopy |    64 | 1,204.7211 ns |  23.9043 ns |  12.5024 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |    64 | 1,197.4656 ns |  14.8238 ns |   7.7532 ns |      - |     - |     - |      56 B |
|                NonGeneric |    64 | 1,979.4035 ns | 220.3945 ns | 115.2706 ns | 0.0557 |     - |     - |   2,104 B |
| DictionaryConcreteControl |    64 |   378.6278 ns |  15.2539 ns |   7.9781 ns |      - |     - |     - |         - |
