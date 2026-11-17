``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F035  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                  Method | Count |          Mean |       Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------------ |------ |--------------:|------------:|-----------:|-------:|------:|------:|----------:|
|        **PreparedConcrete** |     **0** |     **0.7193 ns** |   **0.0274 ns** |  **0.0143 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     0 |    11.3665 ns |   1.9529 ns |  1.0214 ns | 0.0010 |     - |     - |      40 B |
|  UnchangedValuesControl |     0 |     0.6398 ns |   0.0106 ns |  0.0055 ns |      - |     - |     - |         - |
|           QueryProducer |     0 |     6.1311 ns |   0.0442 ns |  0.0231 ns |      - |     - |     - |         - |
|       CollectionBinding |     0 |   196.8670 ns |  31.1063 ns | 16.2692 ns | 0.0170 |     - |     - |     656 B |
|        **PreparedConcrete** |     **1** |     **2.6450 ns** |   **0.1499 ns** |  **0.0784 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     1 |    18.0663 ns |   2.9030 ns |  1.5184 ns | 0.0010 |     - |     - |      40 B |
|  UnchangedValuesControl |     1 |     1.8890 ns |   0.0742 ns |  0.0388 ns |      - |     - |     - |         - |
|           QueryProducer |     1 |    16.4325 ns |   0.4690 ns |  0.2453 ns |      - |     - |     - |         - |
|       CollectionBinding |     1 |   652.5701 ns | 131.9746 ns | 69.0253 ns | 0.0367 |     - |     - |   1,456 B |
|        **PreparedConcrete** |     **8** |    **17.3750 ns** |   **0.7758 ns** |  **0.4058 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     8 |    59.4262 ns |   2.2235 ns |  1.1629 ns | 0.0006 |     - |     - |      40 B |
|  UnchangedValuesControl |     8 |    19.9195 ns |   0.5338 ns |  0.2792 ns |      - |     - |     - |         - |
|           QueryProducer |     8 |    32.1462 ns |   0.4080 ns |  0.2134 ns |      - |     - |     - |         - |
|       CollectionBinding |     8 | 1,726.2947 ns | 173.7746 ns | 90.8875 ns | 0.0674 |     - |     - |   2,792 B |
|        **PreparedConcrete** |    **64** |   **120.1405 ns** |   **1.4562 ns** |  **0.7616 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |    64 |   390.5437 ns |  10.0381 ns |  5.2501 ns |      - |     - |     - |      40 B |
|  UnchangedValuesControl |    64 |   141.5059 ns |   1.5419 ns |  0.8064 ns |      - |     - |     - |         - |
|           QueryProducer |    64 |   132.1210 ns |   4.8904 ns |  2.5578 ns |      - |     - |     - |         - |
|       CollectionBinding |    64 | 9,995.0017 ns | 101.3642 ns | 53.0155 ns | 0.2958 |     - |     - |  13,392 B |
