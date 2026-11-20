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
| **GracefulDrain** |               **0** |     **449.3 ns** |    **116.5 ns** |     **788.1 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **159,021.0 ns** |  **9,482.1 ns** |  **64,118.6 ns** | **148,300.0 ns** |     **-** |     **-** |     **-** |      **5 KB** |
| **GracefulDrain** |              **16** | **169,058.5 ns** |  **7,508.1 ns** |  **50,770.0 ns** | **154,000.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **386,263.7 ns** | **22,502.7 ns** | **152,164.7 ns** | **360,900.0 ns** |     **-** |     **-** |     **-** |     **17 KB** |
