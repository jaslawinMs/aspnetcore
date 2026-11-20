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
| **GracefulDrain** |               **0** |     **427.9 ns** |     **98.23 ns** |     **664.2 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **3 KB** |
| **GracefulDrain** |               **1** | **150,242.7 ns** |  **5,110.68 ns** |  **34,558.7 ns** | **139,500.0 ns** |     **-** |     **-** |     **-** |      **2 KB** |
| **GracefulDrain** |              **16** | **174,292.0 ns** | **21,381.08 ns** | **144,580.1 ns** | **155,900.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **371,088.4 ns** | **14,444.61 ns** |  **97,675.3 ns** | **351,400.0 ns** |     **-** |     **-** |     **-** |     **17 KB** |
