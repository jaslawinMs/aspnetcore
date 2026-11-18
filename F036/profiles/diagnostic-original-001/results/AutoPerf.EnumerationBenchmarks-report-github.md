``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F036-OriginalOnly  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                    Method | Count |          Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------------------- |------ |--------------:|------------:|------------:|-------:|------:|------:|----------:|
|          **TopLevelConcrete** |     **0** |     **1.0147 ns** |   **0.0764 ns** |   **0.0400 ns** |      **-** |     **-** |     **-** |         **-** |
|         TopLevelInterface |     0 |     1.0119 ns |   0.0714 ns |   0.0374 ns |      - |     - |     - |         - |
|             TypedConcrete |     0 |     1.3223 ns |   0.0532 ns |   0.0278 ns |      - |     - |     - |         - |
|                  ReadCopy |     0 |     5.7123 ns |   0.1202 ns |   0.0629 ns |      - |     - |     - |         - |
|                NestedCopy |     0 |    13.3177 ns |   0.1756 ns |   0.0918 ns |      - |     - |     - |         - |
|          MaterializedCopy |     0 |     7.0484 ns |   0.0964 ns |   0.0504 ns |      - |     - |     - |         - |
|                NonGeneric |     0 |     1.2769 ns |   0.0396 ns |   0.0207 ns |      - |     - |     - |         - |
| DictionaryConcreteControl |     0 |     0.3480 ns |   0.0215 ns |   0.0112 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **1** |    **46.8390 ns** |   **1.6979 ns** |   **0.8880 ns** | **0.0014** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     1 |    45.5191 ns |   1.2769 ns |   0.6678 ns | 0.0014 |     - |     - |      56 B |
|             TypedConcrete |     1 |    46.7021 ns |   7.4685 ns |   3.9062 ns | 0.0014 |     - |     - |      56 B |
|                  ReadCopy |     1 |    48.1875 ns |   0.8414 ns |   0.4401 ns | 0.0015 |     - |     - |      56 B |
|                NestedCopy |     1 |    54.9448 ns |   0.3974 ns |   0.2078 ns | 0.0011 |     - |     - |      56 B |
|          MaterializedCopy |     1 |    49.4941 ns |   1.0955 ns |   0.5730 ns | 0.0010 |     - |     - |      56 B |
|                NonGeneric |     1 |    58.1407 ns |   1.9401 ns |   1.0147 ns | 0.0018 |     - |     - |      88 B |
| DictionaryConcreteControl |     1 |     3.1378 ns |   0.1166 ns |   0.0610 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **8** |   **182.0528 ns** |   **2.8447 ns** |   **1.4879 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     8 |   184.4999 ns |   4.2358 ns |   2.2154 ns |      - |     - |     - |      56 B |
|             TypedConcrete |     8 |   185.6786 ns |   2.0629 ns |   1.0789 ns |      - |     - |     - |      56 B |
|                  ReadCopy |     8 |   186.8506 ns |   3.1519 ns |   1.6485 ns |      - |     - |     - |      56 B |
|                NestedCopy |     8 |   213.9976 ns |  39.4983 ns |  20.6584 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |     8 |   189.4574 ns |   2.5106 ns |   1.3131 ns |      - |     - |     - |      56 B |
|                NonGeneric |     8 |   279.6071 ns |   5.8809 ns |   3.0758 ns | 0.0056 |     - |     - |     312 B |
| DictionaryConcreteControl |     8 |    44.2051 ns |   0.5727 ns |   0.2995 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |    **64** | **1,260.6561 ns** |  **78.0181 ns** |  **40.8050 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |    64 | 1,216.5590 ns |   9.7963 ns |   5.1237 ns |      - |     - |     - |      56 B |
|             TypedConcrete |    64 | 1,224.6480 ns |  19.8958 ns |  10.4059 ns |      - |     - |     - |      56 B |
|                  ReadCopy |    64 | 1,235.1585 ns |  14.1711 ns |   7.4118 ns |      - |     - |     - |      56 B |
|                NestedCopy |    64 | 1,244.0412 ns |  26.6564 ns |  13.9418 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |    64 | 1,242.4649 ns |  36.0832 ns |  18.8722 ns |      - |     - |     - |      56 B |
|                NonGeneric |    64 | 1,990.1978 ns | 253.0525 ns | 132.3514 ns | 0.0384 |     - |     - |   2,104 B |
| DictionaryConcreteControl |    64 |   393.5438 ns |   3.4646 ns |   1.8120 ns |      - |     - |     - |         - |
