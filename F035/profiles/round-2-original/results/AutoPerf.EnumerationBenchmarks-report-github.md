``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F035  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|                  Method | Count |           Mean |      Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------------ |------ |---------------:|-----------:|-----------:|-------:|------:|------:|----------:|
|        **PreparedConcrete** |     **0** |      **0.7504 ns** |  **0.0551 ns** |  **0.0288 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     0 |     10.7266 ns |  0.8639 ns |  0.4519 ns | 0.0010 |     - |     - |      40 B |
|  UnchangedValuesControl |     0 |      0.7681 ns |  0.0451 ns |  0.0236 ns |      - |     - |     - |         - |
|           QueryProducer |     0 |      6.3628 ns |  0.0937 ns |  0.0490 ns |      - |     - |     - |         - |
|       CollectionBinding |     0 |    186.1870 ns | 20.4207 ns | 10.6804 ns | 0.0163 |     - |     - |     656 B |
|        **PreparedConcrete** |     **1** |      **2.7463 ns** |  **0.1587 ns** |  **0.0830 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     1 |     16.3600 ns |  0.9141 ns |  0.4781 ns | 0.0009 |     - |     - |      40 B |
|  UnchangedValuesControl |     1 |      3.1071 ns |  0.1786 ns |  0.0934 ns |      - |     - |     - |         - |
|           QueryProducer |     1 |     16.4832 ns |  0.3837 ns |  0.2007 ns |      - |     - |     - |         - |
|       CollectionBinding |     1 |    574.9816 ns | 30.9366 ns | 16.1805 ns | 0.0384 |     - |     - |   1,456 B |
|        **PreparedConcrete** |     **8** |     **13.6049 ns** |  **0.8899 ns** |  **0.4654 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     8 |     58.2999 ns |  0.2888 ns |  0.1510 ns | 0.0006 |     - |     - |      40 B |
|  UnchangedValuesControl |     8 |     18.0448 ns |  0.6241 ns |  0.3264 ns |      - |     - |     - |         - |
|           QueryProducer |     8 |     34.0434 ns |  0.2369 ns |  0.1239 ns |      - |     - |     - |         - |
|       CollectionBinding |     8 |  1,689.5944 ns | 30.2451 ns | 15.8188 ns | 0.0674 |     - |     - |   2,792 B |
|        **PreparedConcrete** |    **64** |     **94.9390 ns** |  **2.3144 ns** |  **1.2105 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |    64 |    392.4668 ns |  6.9920 ns |  3.6570 ns |      - |     - |     - |      40 B |
|  UnchangedValuesControl |    64 |    132.6122 ns |  7.0401 ns |  3.6821 ns |      - |     - |     - |         - |
|           QueryProducer |    64 |    150.5922 ns | 14.6840 ns |  7.6800 ns |      - |     - |     - |         - |
|       CollectionBinding |    64 | 10,321.0891 ns | 66.1091 ns | 34.5763 ns | 0.3079 |     - |     - |  13,392 B |
