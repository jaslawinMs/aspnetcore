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
|        Method | ConnectionCount |         Mean |       Error |       StdDev |       Median | Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------- |---------------- |-------------:|------------:|-------------:|-------------:|------:|------:|------:|----------:|
| **GracefulDrain** |               **0** |     **382.2 ns** |    **103.1 ns** |     **697.0 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **2 KB** |
| **GracefulDrain** |               **1** | **149,122.7 ns** | **11,227.3 ns** |  **75,919.4 ns** | **137,550.0 ns** |     **-** |     **-** |     **-** |      **5 KB** |
| **GracefulDrain** |              **16** | **175,557.7 ns** |  **9,522.7 ns** |  **64,393.3 ns** | **158,800.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **377,205.6 ns** | **18,120.3 ns** | **122,530.8 ns** | **355,400.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
