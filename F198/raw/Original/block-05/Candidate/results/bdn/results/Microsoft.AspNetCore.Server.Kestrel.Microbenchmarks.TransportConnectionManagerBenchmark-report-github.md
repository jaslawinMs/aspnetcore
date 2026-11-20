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
| **GracefulDrain** |               **0** |     **346.3 ns** |    **52.58 ns** |    **355.5 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **175,921.3 ns** | **7,983.48 ns** | **53,984.8 ns** | **164,350.0 ns** |     **-** |     **-** |     **-** |      **5 KB** |
| **GracefulDrain** |              **16** | **180,104.6 ns** | **7,900.97 ns** | **53,426.8 ns** | **162,300.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **372,400.4 ns** | **9,539.74 ns** | **64,508.3 ns** | **360,000.0 ns** |     **-** |     **-** |     **-** |     **17 KB** |
