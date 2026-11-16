``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|                 Method |      Profile |      Mean |     Error |    StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------------- |------------- |----------:|----------:|----------:|------:|------:|------:|----------:|
|    **ActualNoImportOwner** |    **LongEmpty** | **17.798 ns** | **0.2633 ns** | **0.1377 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |    LongEmpty | 17.007 ns | 0.0785 ns | 0.0411 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |    LongEmpty | 16.050 ns | 0.1778 ns | 0.0930 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |  **LongMissing** | **18.020 ns** | **0.2306 ns** | **0.1206 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |  LongMissing | 16.774 ns | 0.2094 ns | 0.1095 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |  LongMissing | 16.201 ns | 0.2402 ns | 0.1256 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |   **QueryEmpty** |  **5.528 ns** | **0.0398 ns** | **0.0208 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |   QueryEmpty |  3.623 ns | 0.2188 ns | 0.1145 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |   QueryEmpty |  1.646 ns | 0.0864 ns | 0.0452 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** | **QueryMissing** |  **5.789 ns** | **0.0371 ns** | **0.0194 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic | QueryMissing |  3.875 ns | 0.0412 ns | 0.0215 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic | QueryMissing |  1.932 ns | 0.0439 ns | 0.0229 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |   **ShortEmpty** |  **5.526 ns** | **0.0814 ns** | **0.0425 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |   ShortEmpty |  3.577 ns | 0.0512 ns | 0.0268 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |   ShortEmpty |  1.663 ns | 0.1849 ns | 0.0967 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** | **ShortMissing** |  **6.122 ns** | **0.0745 ns** | **0.0390 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic | ShortMissing |  3.886 ns | 0.1597 ns | 0.0835 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic | ShortMissing |  1.932 ns | 0.0375 ns | 0.0196 ns |     - |     - |     - |         - |
