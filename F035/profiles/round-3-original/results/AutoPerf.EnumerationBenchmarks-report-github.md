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
|        **PreparedConcrete** |     **0** |      **0.7185 ns** |   **0.0372 ns** |   **0.0195 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     0 |     10.4162 ns |   1.3614 ns |   0.7120 ns | 0.0010 |     - |     - |      40 B |
|  UnchangedValuesControl |     0 |      0.7241 ns |   0.0301 ns |   0.0158 ns |      - |     - |     - |         - |
|           QueryProducer |     0 |      6.1590 ns |   0.0800 ns |   0.0419 ns |      - |     - |     - |         - |
|       CollectionBinding |     0 |    184.8970 ns |  20.0503 ns |  10.4867 ns | 0.0164 |     - |     - |     656 B |
|        **PreparedConcrete** |     **1** |      **2.6949 ns** |   **0.0768 ns** |   **0.0402 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     1 |     16.3949 ns |   2.2811 ns |   1.1931 ns | 0.0011 |     - |     - |      40 B |
|  UnchangedValuesControl |     1 |      3.0363 ns |   0.1540 ns |   0.0806 ns |      - |     - |     - |         - |
|           QueryProducer |     1 |     16.9758 ns |   0.2055 ns |   0.1075 ns |      - |     - |     - |         - |
|       CollectionBinding |     1 |    552.6785 ns |  12.7680 ns |   6.6779 ns | 0.0382 |     - |     - |   1,456 B |
|        **PreparedConcrete** |     **8** |     **12.7758 ns** |   **1.1786 ns** |   **0.6164 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     8 |     58.1038 ns |   0.3119 ns |   0.1631 ns | 0.0006 |     - |     - |      40 B |
|  UnchangedValuesControl |     8 |     17.9103 ns |   0.2625 ns |   0.1373 ns |      - |     - |     - |         - |
|           QueryProducer |     8 |     32.6933 ns |   0.4929 ns |   0.2578 ns |      - |     - |     - |         - |
|       CollectionBinding |     8 |  1,677.3749 ns |  19.6240 ns |  10.2637 ns | 0.0669 |     - |     - |   2,792 B |
|        **PreparedConcrete** |    **64** |     **95.5112 ns** |   **1.3412 ns** |   **0.7015 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |    64 |    397.1523 ns |   5.8163 ns |   3.0420 ns |      - |     - |     - |      40 B |
|  UnchangedValuesControl |    64 |    134.0714 ns |   3.2723 ns |   1.7115 ns |      - |     - |     - |         - |
|           QueryProducer |    64 |    135.0663 ns |   7.1311 ns |   3.7297 ns |      - |     - |     - |         - |
|       CollectionBinding |    64 | 10,537.4963 ns | 963.1507 ns | 503.7465 ns | 0.2974 |     - |     - |  13,392 B |
