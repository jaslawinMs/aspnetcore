``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|            Method | Patterns |        Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------- |------------:|------------:|------------:|-------:|------:|------:|----------:|
| **ConstructSelector** |        **1** |    **280.6 ns** |    **22.23 ns** |    **11.63 ns** | **0.0332** |     **-** |     **-** |      **1 KB** |
| **ConstructSelector** |        **8** |  **1,201.3 ns** |   **152.87 ns** |    **79.95 ns** | **0.1120** |     **-** |     **-** |      **4 KB** |
| **ConstructSelector** |       **64** | **10,047.3 ns** | **1,506.62 ns** |   **787.99 ns** | **0.7496** |     **-** |     **-** |     **28 KB** |
| **ConstructSelector** |      **512** | **87,568.7 ns** | **7,231.22 ns** | **3,782.07 ns** | **5.2083** |     **-** |     **-** |    **219 KB** |
