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
| **GracefulDrain** |               **0** |     **336.5 ns** |     **61.50 ns** |    **415.9 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **158,585.6 ns** | **13,159.61 ns** | **88,986.0 ns** | **143,200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |              **16** | **177,456.7 ns** |  **9,470.61 ns** | **64,040.8 ns** | **159,400.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **367,589.8 ns** | **12,699.28 ns** | **85,873.3 ns** | **351,900.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
