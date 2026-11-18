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
|          **TopLevelConcrete** |     **0** |     **1.0509 ns** |  **0.1213 ns** |  **0.0634 ns** |      **-** |     **-** |     **-** |         **-** |
|         TopLevelInterface |     0 |     0.9887 ns |  0.0423 ns |  0.0221 ns |      - |     - |     - |         - |
|             TypedConcrete |     0 |     1.3037 ns |  0.0754 ns |  0.0395 ns |      - |     - |     - |         - |
|                  ReadCopy |     0 |     6.3224 ns |  0.1283 ns |  0.0671 ns |      - |     - |     - |         - |
|                NestedCopy |     0 |    13.9969 ns |  0.1259 ns |  0.0658 ns |      - |     - |     - |         - |
|          MaterializedCopy |     0 |     7.3488 ns |  0.1412 ns |  0.0738 ns |      - |     - |     - |         - |
|                NonGeneric |     0 |     1.2717 ns |  0.0415 ns |  0.0217 ns |      - |     - |     - |         - |
| DictionaryConcreteControl |     0 |     0.3654 ns |  0.0586 ns |  0.0307 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **1** |    **46.3947 ns** | **11.9021 ns** |  **6.2250 ns** | **0.0014** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     1 |    43.5572 ns |  1.1886 ns |  0.6217 ns | 0.0013 |     - |     - |      56 B |
|             TypedConcrete |     1 |    43.1422 ns |  1.0418 ns |  0.5449 ns | 0.0013 |     - |     - |      56 B |
|                  ReadCopy |     1 |    46.1153 ns |  1.0488 ns |  0.5486 ns | 0.0014 |     - |     - |      56 B |
|                NestedCopy |     1 |    53.3026 ns |  1.2606 ns |  0.6593 ns | 0.0011 |     - |     - |      56 B |
|          MaterializedCopy |     1 |    48.3147 ns |  1.0789 ns |  0.5643 ns | 0.0015 |     - |     - |      56 B |
|                NonGeneric |     1 |    53.9048 ns |  1.3790 ns |  0.7213 ns | 0.0023 |     - |     - |      88 B |
| DictionaryConcreteControl |     1 |     3.0422 ns |  0.0442 ns |  0.0231 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |     **8** |   **176.8321 ns** |  **2.1408 ns** |  **1.1197 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |     8 |   176.8653 ns |  0.7746 ns |  0.4051 ns |      - |     - |     - |      56 B |
|             TypedConcrete |     8 |   177.4812 ns |  2.1167 ns |  1.1071 ns |      - |     - |     - |      56 B |
|                  ReadCopy |     8 |   180.8764 ns |  2.3245 ns |  1.2157 ns |      - |     - |     - |      56 B |
|                NestedCopy |     8 |   191.2405 ns |  1.8419 ns |  0.9634 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |     8 |   181.2587 ns |  1.1303 ns |  0.5912 ns |      - |     - |     - |      56 B |
|                NonGeneric |     8 |   270.9187 ns |  9.6033 ns |  5.0227 ns | 0.0082 |     - |     - |     312 B |
| DictionaryConcreteControl |     8 |    41.0579 ns |  0.5910 ns |  0.3091 ns |      - |     - |     - |         - |
|          **TopLevelConcrete** |    **64** | **1,173.6906 ns** |  **9.3531 ns** |  **4.8918 ns** |      **-** |     **-** |     **-** |      **56 B** |
|         TopLevelInterface |    64 | 1,181.0857 ns | 12.1632 ns |  6.3616 ns |      - |     - |     - |      56 B |
|             TypedConcrete |    64 | 1,211.6347 ns | 17.1782 ns |  8.9845 ns |      - |     - |     - |      56 B |
|                  ReadCopy |    64 | 1,192.1759 ns |  6.3027 ns |  3.2965 ns |      - |     - |     - |      56 B |
|                NestedCopy |    64 | 1,204.0207 ns |  8.0558 ns |  4.2133 ns |      - |     - |     - |      56 B |
|          MaterializedCopy |    64 | 1,194.8741 ns | 16.3776 ns |  8.5658 ns |      - |     - |     - |      56 B |
|                NonGeneric |    64 | 1,853.3532 ns | 54.7464 ns | 28.6334 ns | 0.0383 |     - |     - |   2,104 B |
| DictionaryConcreteControl |    64 |   365.9402 ns |  3.2319 ns |  1.6904 ns |      - |     - |     - |         - |
