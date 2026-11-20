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
| **GracefulDrain** |               **0** |     **542.5 ns** |     **396.2 ns** |   **2,678.9 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **1 KB** |
| **GracefulDrain** |               **1** | **147,774.9 ns** |   **9,576.0 ns** |  **64,753.2 ns** | **136,000.0 ns** |     **-** |     **-** |     **-** |      **3 KB** |
| **GracefulDrain** |              **16** | **178,144.3 ns** |  **12,622.7 ns** |  **85,355.3 ns** | **156,600.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **391,627.3 ns** | **109,800.8 ns** | **742,479.5 ns** | **346,600.0 ns** |     **-** |     **-** |     **-** |     **17 KB** |
