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
| **GracefulDrain** |               **0** |     **363.7 ns** |    **102.0 ns** |     **689.9 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **146,940.3 ns** | **12,240.3 ns** |  **82,769.6 ns** | **136,800.0 ns** |     **-** |     **-** |     **-** |      **3 KB** |
| **GracefulDrain** |              **16** | **173,847.5 ns** | **10,798.3 ns** |  **73,018.5 ns** | **153,900.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **379,931.0 ns** | **32,911.6 ns** | **222,549.9 ns** | **357,150.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
