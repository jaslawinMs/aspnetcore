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
| **GracefulDrain** |               **0** |     **515.0 ns** |    **226.4 ns** |  **1,531.0 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **147,939.7 ns** |  **8,494.3 ns** | **57,438.7 ns** | **136,100.0 ns** |     **-** |     **-** |     **-** |      **5 KB** |
| **GracefulDrain** |              **16** | **167,140.3 ns** |  **6,849.5 ns** | **46,316.8 ns** | **154,000.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **363,359.3 ns** | **10,712.5 ns** | **72,438.8 ns** | **348,600.0 ns** |     **-** |     **-** |     **-** |     **17 KB** |
