``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  Force=False  
Server=True  Toolchain=SharedHostToolchain  InvocationCount=1  
IterationCount=501  LaunchCount=1  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=31  

```
|        Method | ConnectionCount |         Mean |        Error |      StdDev |       Median | Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------- |---------------- |-------------:|-------------:|------------:|-------------:|------:|------:|------:|----------:|
| **GracefulDrain** |               **0** |     **373.1 ns** |     **95.67 ns** |    **646.9 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **145,993.7 ns** | **10,096.47 ns** | **68,272.9 ns** | **136,350.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |              **16** | **169,325.5 ns** |  **8,526.01 ns** | **57,653.4 ns** | **151,600.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **361,420.0 ns** |  **9,595.63 ns** | **64,886.2 ns** | **347,200.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
