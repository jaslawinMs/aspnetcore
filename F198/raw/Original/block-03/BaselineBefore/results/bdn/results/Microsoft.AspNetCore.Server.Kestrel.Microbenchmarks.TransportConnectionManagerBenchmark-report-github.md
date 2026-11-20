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
| **GracefulDrain** |               **0** |     **366.9 ns** |     **96.63 ns** |    **653.4 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **145,977.0 ns** |  **5,692.60 ns** | **38,493.7 ns** | **136,900.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |              **16** | **176,551.5 ns** | **11,067.52 ns** | **74,839.2 ns** | **158,000.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **364,198.8 ns** | **10,584.09 ns** | **71,570.2 ns** | **351,800.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
