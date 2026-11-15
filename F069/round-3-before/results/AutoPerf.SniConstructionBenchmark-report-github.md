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
| **ConstructSelector** |        **1** |    **215.7 ns** |    **27.30 ns** |    **14.28 ns** | **0.0272** |      **-** |     **-** |      **1 KB** |
| **ConstructSelector** |        **8** |    **906.9 ns** |    **49.65 ns** |    **25.97 ns** | **0.0995** |      **-** |     **-** |      **4 KB** |
| **ConstructSelector** |       **64** |  **7,850.8 ns** |   **522.43 ns** |   **273.24 ns** | **0.7022** |      **-** |     **-** |     **26 KB** |
| **ConstructSelector** |      **512** | **75,465.4 ns** | **8,179.13 ns** | **4,277.84 ns** | **4.9716** | **0.7102** |     **-** |    **205 KB** |
