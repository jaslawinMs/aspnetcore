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
|        Method | ConnectionCount |         Mean |       Error |      StdDev |       Median | Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------- |---------------- |-------------:|------------:|------------:|-------------:|------:|------:|------:|----------:|
| **GracefulDrain** |               **0** |     **396.6 ns** |    **110.0 ns** |    **744.1 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **146,800.2 ns** | **10,949.4 ns** | **74,040.2 ns** | **136,800.0 ns** |     **-** |     **-** |     **-** |      **2 KB** |
| **GracefulDrain** |              **16** | **169,551.5 ns** |  **8,722.3 ns** | **58,981.0 ns** | **152,800.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **365,097.0 ns** |  **9,170.9 ns** | **62,014.0 ns** | **351,000.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
