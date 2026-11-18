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
|          **TopLevelConcrete** |     **0** |     **1.3690 ns** |  **0.0650 ns** |  **0.0340 ns** |      **-** |     **-** |     **-** |         **-** |
|         TopLevelInterface |     0 |     1.5497 ns |  0.0385 ns |  0.0201 ns |      - |     - |     - |         - |
|             TypedConcrete |     0 |     1.6903 ns |  0.0492 ns |  0.0258 ns |      - |     - |     - |         - |
|                  ReadCopy |     0 |     9.6484 ns |  0.8643 ns |  0.4521 ns |      - |     - |     - |         - |
|                NestedCopy |     0 |    28.8112 ns |  3.7104 ns |  1.9406 ns |      - |     - |     - |         - |
|          MaterializedCopy |     0 |    11.6831 ns |  0.7567 ns |  0.3958 ns |      - |     - |     - |         - |
|                NonGeneric |     0 |     1.1041 ns |  0.0460 ns |  0.0241 ns |      - |     - |     - |         - |
| DictionaryConcreteControl |     0 |     0.3497 ns |  0.0253 ns |  0.0132 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **1** |    **45.0495 ns** |  **4.2883 ns** |  **2.2429 ns** | **0.0014** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     1 |    43.7717 ns |  0.8858 ns |  0.4633 ns | 0.0014 |     - |     - |      56 B |
|             TypedConcrete |     1 |    43.2269 ns |  1.2661 ns |  0.6622 ns | 0.0013 |     - |     - |      56 B |
|                  ReadCopy |     1 |    50.7863 ns |  4.1045 ns |  2.1467 ns | 0.0016 |     - |     - |      56 B |
|                NestedCopy |     1 |    70.3651 ns |  3.8442 ns |  2.0106 ns | 0.0014 |     - |     - |      56 B |
|          MaterializedCopy |     1 |    52.5276 ns |  1.2182 ns |  0.6372 ns | 0.0011 |     - |     - |      56 B |
|                NonGeneric |     1 |    57.6891 ns |  3.2159 ns |  1.6820 ns | 0.0022 |     - |     - |      88 B |
| DictionaryConcreteControl |     1 |     3.7650 ns |  0.1400 ns |  0.0732 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **8** |   **181.2503 ns** |  **3.0395 ns** |  **1.5897 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     8 |   180.4210 ns |  1.6406 ns |  0.8581 ns |      - |     - |     - |      56 B |
|             TypedConcrete |     8 |   177.9481 ns |  2.7058 ns |  1.4152 ns |      - |     - |     - |      56 B |
|                  ReadCopy |     8 |   191.3841 ns |  1.9643 ns |  1.0274 ns |      - |     - |     - |      56 B |
|                NestedCopy |     8 |   213.5184 ns |  3.0056 ns |  1.5720 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |     8 |   191.9839 ns |  1.2727 ns |  0.6657 ns |      - |     - |     - |      56 B |
|                NonGeneric |     8 |   279.7828 ns |  5.4851 ns |  2.8688 ns | 0.0082 |     - |     - |     312 B |
| DictionaryConcreteControl |     8 |    47.1762 ns |  1.1134 ns |  0.5824 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |    **64** | **1,216.2394 ns** | **14.2225 ns** |  **7.4386 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |    64 | 1,211.0429 ns | 20.0179 ns | 10.4697 ns |      - |     - |     - |      56 B |
|             TypedConcrete |    64 | 1,215.2667 ns | 16.9128 ns |  8.8457 ns |      - |     - |     - |      56 B |
|                  ReadCopy |    64 | 1,231.3784 ns | 13.5644 ns |  7.0944 ns |      - |     - |     - |      56 B |
|                NestedCopy |    64 | 1,255.4828 ns | 15.0378 ns |  7.8651 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |    64 | 1,221.5575 ns | 22.7106 ns | 11.8781 ns |      - |     - |     - |      56 B |
|                NonGeneric |    64 | 1,946.4074 ns | 57.7112 ns | 30.1841 ns | 0.0383 |     - |     - |   2,104 B |
| DictionaryConcreteControl |    64 |   375.5468 ns | 11.1347 ns |  5.8237 ns |      - |     - |     - |         - |
