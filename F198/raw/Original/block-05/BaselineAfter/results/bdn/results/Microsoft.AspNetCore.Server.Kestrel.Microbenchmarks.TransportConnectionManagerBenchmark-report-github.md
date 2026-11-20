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
|        Method | ConnectionCount |         Mean |        Error |       StdDev |       Median | Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------- |---------------- |-------------:|-------------:|-------------:|-------------:|------:|------:|------:|----------:|
| **GracefulDrain** |               **0** |     **361.5 ns** |     **85.71 ns** |     **579.6 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **153,189.6 ns** | **10,331.85 ns** |  **69,864.6 ns** | **139,300.0 ns** |     **-** |     **-** |     **-** |      **5 KB** |
| **GracefulDrain** |              **16** | **167,875.2 ns** | **11,924.88 ns** |  **80,636.7 ns** | **151,700.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **365,800.4 ns** | **18,713.67 ns** | **126,542.9 ns** | **343,800.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
