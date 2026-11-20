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
| **GracefulDrain** |               **0** |     **385.8 ns** |    **101.2 ns** |     **684.0 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **147,863.7 ns** |  **9,997.6 ns** |  **67,604.5 ns** | **136,700.0 ns** |     **-** |     **-** |     **-** |      **1 KB** |
| **GracefulDrain** |              **16** | **166,055.7 ns** |  **5,928.8 ns** |  **40,090.7 ns** | **150,600.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **367,987.1 ns** | **16,559.0 ns** | **111,972.6 ns** | **352,050.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
