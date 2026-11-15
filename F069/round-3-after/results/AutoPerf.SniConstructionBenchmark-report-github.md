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
| **ConstructSelector** |        **1** |    **206.7 ns** |    **18.64 ns** |     **9.75 ns** | **0.0268** |      **-** |     **-** |      **1 KB** |
| **ConstructSelector** |        **8** |    **916.3 ns** |    **54.43 ns** |    **28.47 ns** | **0.0977** |      **-** |     **-** |      **4 KB** |
| **ConstructSelector** |       **64** |  **9,765.5 ns** |   **918.93 ns** |   **480.62 ns** | **0.7634** |      **-** |     **-** |     **28 KB** |
| **ConstructSelector** |      **512** | **88,388.8 ns** | **5,018.64 ns** | **2,624.84 ns** | **5.9122** | **1.6892** |     **-** |    **219 KB** |
