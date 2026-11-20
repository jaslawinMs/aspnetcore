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
|        Method | ConnectionCount |         Mean |      Error |      StdDev |       Median | Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------- |---------------- |-------------:|-----------:|------------:|-------------:|------:|------:|------:|----------:|
| **GracefulDrain** |               **0** |     **508.4 ns** |   **276.6 ns** |  **1,870.1 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **154,118.2 ns** | **7,639.3 ns** | **51,657.6 ns** | **140,200.0 ns** |     **-** |     **-** |     **-** |      **2 KB** |
| **GracefulDrain** |              **16** | **169,931.1 ns** | **6,994.1 ns** | **47,294.7 ns** | **154,400.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **361,467.9 ns** | **6,631.3 ns** | **44,841.4 ns** | **350,800.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
