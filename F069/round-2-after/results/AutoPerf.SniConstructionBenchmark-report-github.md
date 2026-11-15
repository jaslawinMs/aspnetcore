``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|            Method | Patterns |        Mean |        Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------- |------------:|-------------:|------------:|-------:|------:|------:|----------:|
| **ConstructSelector** |        **1** |    **235.0 ns** |     **23.00 ns** |    **12.03 ns** | **0.0258** |     **-** |     **-** |      **1 KB** |
| **ConstructSelector** |        **8** |  **1,090.8 ns** |    **138.19 ns** |    **72.28 ns** | **0.0953** |     **-** |     **-** |      **4 KB** |
| **ConstructSelector** |       **64** | **10,396.6 ns** |    **457.85 ns** |   **239.46 ns** | **0.7491** |     **-** |     **-** |     **28 KB** |
| **ConstructSelector** |      **512** | **99,641.7 ns** | **10,049.80 ns** | **5,256.24 ns** | **5.4348** |     **-** |     **-** |    **219 KB** |
