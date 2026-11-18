``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F036-SourceComparison  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                    Method | Count |          Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------------------- |------ |--------------:|-----------:|-----------:|-------:|------:|------:|----------:|
|          **TopLevelConcrete** |     **0** |     **1.3792 ns** |  **0.0769 ns** |  **0.0402 ns** |      **-** |     **-** |     **-** |         **-** |
|         TopLevelInterface |     0 |     1.3730 ns |  0.0629 ns |  0.0329 ns |      - |     - |     - |         - |
|             TypedConcrete |     0 |     1.7155 ns |  0.0507 ns |  0.0265 ns |      - |     - |     - |         - |
|                  ReadCopy |     0 |     8.7816 ns |  0.3553 ns |  0.1858 ns |      - |     - |     - |         - |
|                NestedCopy |     0 |    26.6213 ns |  1.6267 ns |  0.8508 ns |      - |     - |     - |         - |
|          MaterializedCopy |     0 |    11.7032 ns |  0.4928 ns |  0.2578 ns |      - |     - |     - |         - |
|                NonGeneric |     0 |     1.3188 ns |  0.0514 ns |  0.0269 ns |      - |     - |     - |         - |
| DictionaryConcreteControl |     0 |     0.3758 ns |  0.0613 ns |  0.0320 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **1** |    **46.3693 ns** |  **1.3704 ns** |  **0.7168 ns** | **0.0015** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     1 |    46.7309 ns |  1.6705 ns |  0.8737 ns | 0.0014 |     - |     - |      56 B |
|             TypedConcrete |     1 |    46.9517 ns |  2.2057 ns |  1.1536 ns | 0.0014 |     - |     - |      56 B |
|                  ReadCopy |     1 |    50.8563 ns |  1.9434 ns |  1.0164 ns | 0.0011 |     - |     - |      56 B |
|                NestedCopy |     1 |    66.8053 ns |  1.2529 ns |  0.6553 ns | 0.0014 |     - |     - |      56 B |
|          MaterializedCopy |     1 |    53.6881 ns |  0.5053 ns |  0.2643 ns | 0.0011 |     - |     - |      56 B |
|                NonGeneric |     1 |    58.2853 ns |  3.2394 ns |  1.6943 ns | 0.0018 |     - |     - |      88 B |
| DictionaryConcreteControl |     1 |     3.4012 ns |  0.1033 ns |  0.0540 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **8** |   **178.6731 ns** |  **4.5896 ns** |  **2.4005 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     8 |   179.8213 ns |  3.2411 ns |  1.6951 ns |      - |     - |     - |      56 B |
|             TypedConcrete |     8 |   180.0335 ns |  2.7188 ns |  1.4220 ns |      - |     - |     - |      56 B |
|                  ReadCopy |     8 |   187.1071 ns |  3.6243 ns |  1.8956 ns |      - |     - |     - |      56 B |
|                NestedCopy |     8 |   204.8951 ns |  2.8720 ns |  1.5021 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |     8 |   189.0631 ns |  1.2552 ns |  0.6565 ns |      - |     - |     - |      56 B |
|                NonGeneric |     8 |   273.8263 ns |  6.7915 ns |  3.5521 ns | 0.0082 |     - |     - |     312 B |
| DictionaryConcreteControl |     8 |    46.2054 ns |  1.8990 ns |  0.9932 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |    **64** | **1,207.2850 ns** | **12.6352 ns** |  **6.6085 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |    64 | 1,191.3344 ns | 18.5453 ns |  9.6995 ns |      - |     - |     - |      56 B |
|             TypedConcrete |    64 | 1,190.0296 ns | 38.1584 ns | 19.9576 ns |      - |     - |     - |      56 B |
|                  ReadCopy |    64 | 1,207.2490 ns | 34.5074 ns | 18.0481 ns |      - |     - |     - |      56 B |
|                NestedCopy |    64 | 1,214.5999 ns | 22.5845 ns | 11.8121 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |    64 | 1,188.5093 ns | 19.9540 ns | 10.4363 ns |      - |     - |     - |      56 B |
|                NonGeneric |    64 | 1,955.5007 ns | 60.4237 ns | 31.6027 ns | 0.0395 |     - |     - |   2,104 B |
| DictionaryConcreteControl |    64 |   373.9285 ns | 13.6017 ns |  7.1140 ns |      - |     - |     - |         - |
