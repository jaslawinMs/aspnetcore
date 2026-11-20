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
| **GracefulDrain** |               **0** |     **406.6 ns** |     **123.7 ns** |     **836.6 ns** |     **200.0 ns** |     **-** |     **-** |     **-** |      **4 KB** |
| **GracefulDrain** |               **1** | **144,488.5 ns** |   **7,146.7 ns** |  **48,326.1 ns** | **135,250.0 ns** |     **-** |     **-** |     **-** |      **5 KB** |
| **GracefulDrain** |              **16** | **167,480.4 ns** |  **12,448.7 ns** |  **84,178.7 ns** | **150,900.0 ns** |     **-** |     **-** |     **-** |      **6 KB** |
| **GracefulDrain** |             **256** | **402,411.4 ns** | **104,119.7 ns** | **704,063.7 ns** | **348,400.0 ns** |     **-** |     **-** |     **-** |     **19 KB** |
