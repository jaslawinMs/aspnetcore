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
| **GracefulDrain** |               **0** |     **433.5 ns** |    **113.6 ns** |     **768.0 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **147,008.0 ns** |  **9,552.5 ns** |  **64,594.4 ns** | **136,700.0 ns** |     **-** |     **-** |     **-** |      **5 KB** |
| **GracefulDrain** |              **16** | **178,896.2 ns** | **19,010.7 ns** | **128,551.3 ns** | **150,300.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **370,948.9 ns** | **13,887.2 ns** |  **93,906.2 ns** | **351,100.0 ns** |     **-** |     **-** |     **-** |     **15 KB** |
