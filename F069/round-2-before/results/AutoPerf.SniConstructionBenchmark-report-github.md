``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|            Method | Patterns |        Mean |       Error |      StdDev |  Gen 0 |  Gen 1 | Gen 2 | Allocated |
|------------------ |--------- |------------:|------------:|------------:|-------:|-------:|------:|----------:|
| **ConstructSelector** |        **1** |    **210.5 ns** |     **9.36 ns** |     **4.89 ns** | **0.0262** |      **-** |     **-** |      **1 KB** |
| **ConstructSelector** |        **8** |    **956.8 ns** |    **41.43 ns** |    **21.67 ns** | **0.0991** |      **-** |     **-** |      **4 KB** |
| **ConstructSelector** |       **64** |  **8,273.1 ns** |   **458.55 ns** |   **239.83 ns** | **0.6631** |      **-** |     **-** |     **26 KB** |
| **ConstructSelector** |      **512** | **78,927.5 ns** | **8,850.63 ns** | **4,629.05 ns** | **5.2083** | **0.7440** |     **-** |    **205 KB** |
