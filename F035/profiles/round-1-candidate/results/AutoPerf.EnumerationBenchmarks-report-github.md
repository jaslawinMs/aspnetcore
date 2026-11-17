``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F035  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                  Method | Count |           Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------------ |------ |---------------:|------------:|------------:|-------:|------:|------:|----------:|
|        **PreparedConcrete** |     **0** |      **0.7310 ns** |   **0.0178 ns** |   **0.0093 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     0 |     10.4880 ns |   1.3461 ns |   0.7040 ns | 0.0010 |     - |     - |      40 B |
|  UnchangedValuesControl |     0 |      0.7123 ns |   0.0489 ns |   0.0256 ns |      - |     - |     - |         - |
|           QueryProducer |     0 |      6.1457 ns |   0.0967 ns |   0.0506 ns |      - |     - |     - |         - |
|       CollectionBinding |     0 |    206.1421 ns |  53.6406 ns |  28.0550 ns | 0.0154 |     - |     - |     656 B |
|        **PreparedConcrete** |     **1** |      **2.6865 ns** |   **0.1003 ns** |   **0.0525 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     1 |     15.6840 ns |   0.2967 ns |   0.1552 ns | 0.0011 |     - |     - |      40 B |
|  UnchangedValuesControl |     1 |      3.0286 ns |   0.1852 ns |   0.0968 ns |      - |     - |     - |         - |
|           QueryProducer |     1 |     16.8361 ns |   0.3282 ns |   0.1717 ns |      - |     - |     - |         - |
|       CollectionBinding |     1 |    581.2736 ns |  71.4855 ns |  37.3883 ns | 0.0336 |     - |     - |   1,456 B |
|        **PreparedConcrete** |     **8** |     **17.5424 ns** |   **0.5674 ns** |   **0.2967 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     8 |     66.2823 ns |   8.5704 ns |   4.4825 ns | 0.0007 |     - |     - |      40 B |
|  UnchangedValuesControl |     8 |     18.0638 ns |   0.4373 ns |   0.2287 ns |      - |     - |     - |         - |
|           QueryProducer |     8 |     33.3857 ns |   0.9664 ns |   0.5055 ns |      - |     - |     - |         - |
|       CollectionBinding |     8 |  1,860.6984 ns | 245.3082 ns | 128.3009 ns | 0.0720 |     - |     - |   2,792 B |
|        **PreparedConcrete** |    **64** |    **120.6356 ns** |   **2.4284 ns** |   **1.2701 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |    64 |    444.3532 ns |   6.8750 ns |   3.5958 ns |      - |     - |     - |      40 B |
|  UnchangedValuesControl |    64 |    133.7251 ns |   3.3708 ns |   1.7630 ns |      - |     - |     - |         - |
|           QueryProducer |    64 |    140.2374 ns |   8.1608 ns |   4.2682 ns |      - |     - |     - |         - |
|       CollectionBinding |    64 | 10,178.1137 ns | 139.5614 ns |  72.9933 ns | 0.3008 |     - |     - |  13,393 B |
