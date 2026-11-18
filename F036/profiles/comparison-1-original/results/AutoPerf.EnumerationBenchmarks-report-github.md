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
|          **TopLevelConcrete** |     **0** |     **0.9979 ns** |   **0.0415 ns** |   **0.0217 ns** |      **-** |     **-** |     **-** |         **-** |
|         TopLevelInterface |     0 |     1.0295 ns |   0.0618 ns |   0.0323 ns |      - |     - |     - |         - |
|             TypedConcrete |     0 |     1.2455 ns |   0.0996 ns |   0.0521 ns |      - |     - |     - |         - |
|                  ReadCopy |     0 |     5.7997 ns |   0.1679 ns |   0.0878 ns |      - |     - |     - |         - |
|                NestedCopy |     0 |    13.5477 ns |   0.2925 ns |   0.1530 ns |      - |     - |     - |         - |
|          MaterializedCopy |     0 |     7.3668 ns |   0.1509 ns |   0.0789 ns |      - |     - |     - |         - |
|                NonGeneric |     0 |     1.1007 ns |   0.0872 ns |   0.0456 ns |      - |     - |     - |         - |
| DictionaryConcreteControl |     0 |     0.3670 ns |   0.0287 ns |   0.0150 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **1** |    **47.1372 ns** |   **3.7576 ns** |   **1.9653 ns** | **0.0014** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     1 |    45.4796 ns |   1.8923 ns |   0.9897 ns | 0.0014 |     - |     - |      56 B |
|             TypedConcrete |     1 |    46.0859 ns |   0.6780 ns |   0.3546 ns | 0.0014 |     - |     - |      56 B |
|                  ReadCopy |     1 |    49.8956 ns |   3.3140 ns |   1.7333 ns | 0.0010 |     - |     - |      56 B |
|                NestedCopy |     1 |    59.2900 ns |   7.3083 ns |   3.8224 ns | 0.0012 |     - |     - |      56 B |
|          MaterializedCopy |     1 |    50.7467 ns |   1.5658 ns |   0.8189 ns | 0.0016 |     - |     - |      56 B |
|                NonGeneric |     1 |    60.0419 ns |   1.5996 ns |   0.8366 ns | 0.0019 |     - |     - |      88 B |
| DictionaryConcreteControl |     1 |     3.7198 ns |   0.0788 ns |   0.0412 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **8** |   **182.7604 ns** |   **1.9725 ns** |   **1.0316 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     8 |   192.0322 ns |  18.7810 ns |   9.8228 ns |      - |     - |     - |      56 B |
|             TypedConcrete |     8 |   184.2698 ns |   4.6748 ns |   2.4450 ns |      - |     - |     - |      56 B |
|                  ReadCopy |     8 |   192.3537 ns |  11.6109 ns |   6.0727 ns |      - |     - |     - |      56 B |
|                NestedCopy |     8 |   198.9802 ns |   3.5000 ns |   1.8306 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |     8 |   189.1412 ns |   5.1758 ns |   2.7070 ns |      - |     - |     - |      56 B |
|                NonGeneric |     8 |   284.3433 ns |  10.8031 ns |   5.6502 ns | 0.0057 |     - |     - |     312 B |
| DictionaryConcreteControl |     8 |    48.8933 ns |   2.5640 ns |   1.3410 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |    **64** | **1,220.9290 ns** |  **22.6683 ns** |  **11.8560 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |    64 | 1,236.8020 ns |  41.0802 ns |  21.4858 ns |      - |     - |     - |      56 B |
|             TypedConcrete |    64 | 1,236.2950 ns |  18.3290 ns |   9.5864 ns |      - |     - |     - |      56 B |
|                  ReadCopy |    64 | 1,234.0349 ns |  15.8146 ns |   8.2714 ns |      - |     - |     - |      56 B |
|                NestedCopy |    64 | 1,243.5714 ns |  19.0463 ns |   9.9616 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |    64 | 1,240.2580 ns |  18.3063 ns |   9.5745 ns |      - |     - |     - |      56 B |
|                NonGeneric |    64 | 2,105.1641 ns | 330.5918 ns | 172.9059 ns | 0.0393 |     - |     - |   2,104 B |
| DictionaryConcreteControl |    64 |   410.9617 ns |  44.7299 ns |  23.3946 ns |      - |     - |     - |         - |
