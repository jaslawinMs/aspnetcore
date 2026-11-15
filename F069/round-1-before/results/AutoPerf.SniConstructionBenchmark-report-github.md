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
| **ConstructSelector** |        **1** |    **211.8 ns** |    **28.99 ns** |    **15.16 ns** | **0.0265** |      **-** |     **-** |      **1 KB** |
| **ConstructSelector** |        **8** |    **961.1 ns** |   **135.54 ns** |    **70.89 ns** | **0.0935** |      **-** |     **-** |      **4 KB** |
| **ConstructSelector** |       **64** |  **8,587.1 ns** |   **832.18 ns** |   **435.25 ns** | **0.7156** |      **-** |     **-** |     **26 KB** |
| **ConstructSelector** |      **512** | **74,826.4 ns** | **5,560.64 ns** | **2,908.32 ns** | **5.2083** | **0.7440** |     **-** |    **205 KB** |
