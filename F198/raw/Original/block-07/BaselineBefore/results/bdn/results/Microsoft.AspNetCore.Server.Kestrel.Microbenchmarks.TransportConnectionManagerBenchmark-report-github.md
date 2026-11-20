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
| **GracefulDrain** |               **0** |     **458.3 ns** |    **232.0 ns** |  **1,568.6 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **156,322.8 ns** |  **7,099.2 ns** | **48,005.1 ns** | **146,300.0 ns** |     **-** |     **-** |     **-** |      **5 KB** |
| **GracefulDrain** |              **16** | **169,048.2 ns** |  **9,525.6 ns** | **64,412.9 ns** | **153,350.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **375,037.1 ns** | **12,488.3 ns** | **84,446.6 ns** | **359,300.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
