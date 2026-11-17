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
|        **PreparedConcrete** |     **0** |      **0.7224 ns** |   **0.0264 ns** |   **0.0138 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     0 |     11.3372 ns |   1.1711 ns |   0.6125 ns | 0.0010 |     - |     - |      40 B |
|  UnchangedValuesControl |     0 |      0.6412 ns |   0.0063 ns |   0.0033 ns |      - |     - |     - |         - |
|           QueryProducer |     0 |      6.1220 ns |   0.0251 ns |   0.0131 ns |      - |     - |     - |         - |
|       CollectionBinding |     0 |    215.2966 ns |  62.1351 ns |  32.4979 ns | 0.0169 |     - |     - |     656 B |
|        **PreparedConcrete** |     **1** |      **2.6666 ns** |   **0.1738 ns** |   **0.0909 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     1 |     17.6633 ns |   1.1357 ns |   0.5940 ns | 0.0011 |     - |     - |      40 B |
|  UnchangedValuesControl |     1 |      1.9042 ns |   0.1620 ns |   0.0847 ns |      - |     - |     - |         - |
|           QueryProducer |     1 |     17.0188 ns |   0.4710 ns |   0.2464 ns |      - |     - |     - |         - |
|       CollectionBinding |     1 |    564.9546 ns |  29.2177 ns |  15.2814 ns | 0.0386 |     - |     - |   1,456 B |
|        **PreparedConcrete** |     **8** |     **13.7036 ns** |   **1.4751 ns** |   **0.7715 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |     8 |     61.3100 ns |   2.8645 ns |   1.4982 ns | 0.0006 |     - |     - |      40 B |
|  UnchangedValuesControl |     8 |     19.9843 ns |   0.5290 ns |   0.2767 ns |      - |     - |     - |         - |
|           QueryProducer |     8 |     33.8608 ns |   0.8430 ns |   0.4409 ns |      - |     - |     - |         - |
|       CollectionBinding |     8 |  1,681.8173 ns |  57.2614 ns |  29.9488 ns | 0.0670 |     - |     - |   2,792 B |
|        **PreparedConcrete** |    **64** |     **95.0689 ns** |   **1.1197 ns** |   **0.5857 ns** |      **-** |     **-** |     **-** |         **-** |
| PreparedPreboxedGeneric |    64 |    411.3630 ns |   2.1251 ns |   1.1115 ns |      - |     - |     - |      40 B |
|  UnchangedValuesControl |    64 |    145.4737 ns |   3.0909 ns |   1.6166 ns |      - |     - |     - |         - |
|           QueryProducer |    64 |    143.9680 ns |   5.3729 ns |   2.8101 ns |      - |     - |     - |         - |
|       CollectionBinding |    64 | 10,174.8312 ns | 197.4538 ns | 103.2721 ns | 0.3024 |     - |     - |  13,393 B |
