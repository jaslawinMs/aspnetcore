``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F035  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                  Method | Count |           Mean |         Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------------ |------ |---------------:|--------------:|------------:|-------:|------:|------:|----------:|
|        **PreparedConcrete** |     **0** |      **0.7458 ns** |     **0.0474 ns** |   **0.0248 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     0 |     10.8919 ns |     2.0173 ns |   1.0551 ns | 0.0011 |     - |     - |      40 B |
|  UnchangedValuesControl |     0 |      0.7708 ns |     0.0358 ns |   0.0187 ns |      - |     - |     - |         - |
|           QueryProducer |     0 |      6.1853 ns |     0.0907 ns |   0.0474 ns |      - |     - |     - |         - |
|       CollectionBinding |     0 |    191.3862 ns |    16.7627 ns |   8.7672 ns | 0.0169 |     - |     - |     656 B |
|        **PreparedConcrete** |     **1** |      **2.6732 ns** |     **0.1415 ns** |   **0.0740 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     1 |     15.8455 ns |     1.0846 ns |   0.5673 ns | 0.0011 |     - |     - |      40 B |
|  UnchangedValuesControl |     1 |      3.0363 ns |     0.1650 ns |   0.0863 ns |      - |     - |     - |         - |
|           QueryProducer |     1 |     16.8624 ns |     0.2593 ns |   0.1356 ns |      - |     - |     - |         - |
|       CollectionBinding |     1 |    564.3241 ns |    58.0089 ns |  30.3398 ns | 0.0337 |     - |     - |   1,456 B |
|        **PreparedConcrete** |     **8** |     **17.5156 ns** |     **0.7368 ns** |   **0.3854 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     8 |     61.1628 ns |     0.5064 ns |   0.2649 ns | 0.0006 |     - |     - |      40 B |
|  UnchangedValuesControl |     8 |     17.6676 ns |     1.3612 ns |   0.7119 ns |      - |     - |     - |         - |
|           QueryProducer |     8 |     32.9676 ns |     0.8574 ns |   0.4484 ns |      - |     - |     - |         - |
|       CollectionBinding |     8 |  1,716.4157 ns |    43.1342 ns |  22.5600 ns | 0.0679 |     - |     - |   2,792 B |
|        **PreparedConcrete** |    **64** |    **119.9234 ns** |     **1.2075 ns** |   **0.6315 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |    64 |    424.6979 ns |     7.2256 ns |   3.7791 ns |      - |     - |     - |      40 B |
|  UnchangedValuesControl |    64 |    131.4283 ns |     3.9940 ns |   2.0889 ns |      - |     - |     - |         - |
|           QueryProducer |    64 |    145.9967 ns |     6.0949 ns |   3.1878 ns |      - |     - |     - |         - |
|       CollectionBinding |    64 | 10,226.4113 ns | 1,156.5588 ns | 604.9026 ns | 0.3011 |     - |     - |  13,393 B |
