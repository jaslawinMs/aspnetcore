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
|    **ActualNoImportOwner** |    **LongEmpty** | **17.353 ns** | **0.1008 ns** | **0.0527 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |    LongEmpty | 17.102 ns | 0.1861 ns | 0.0973 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |    LongEmpty | 15.790 ns | 0.0872 ns | 0.0456 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |  **LongMissing** | **17.232 ns** | **0.2344 ns** | **0.1226 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |  LongMissing | 16.739 ns | 0.0938 ns | 0.0491 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |  LongMissing | 16.115 ns | 0.1407 ns | 0.0736 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |   **QueryEmpty** |  **4.198 ns** | **0.0551 ns** | **0.0288 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |   QueryEmpty |  3.599 ns | 0.1131 ns | 0.0592 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |   QueryEmpty |  1.637 ns | 0.0498 ns | 0.0261 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** | **QueryMissing** |  **4.584 ns** | **0.0501 ns** | **0.0262 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic | QueryMissing |  3.880 ns | 0.0588 ns | 0.0308 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic | QueryMissing |  1.928 ns | 0.0265 ns | 0.0139 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |   **ShortEmpty** |  **4.195 ns** | **0.0563 ns** | **0.0295 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |   ShortEmpty |  3.570 ns | 0.0508 ns | 0.0266 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |   ShortEmpty |  1.650 ns | 0.0716 ns | 0.0375 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** | **ShortMissing** |  **4.832 ns** | **0.0644 ns** | **0.0337 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic | ShortMissing |  3.872 ns | 0.0445 ns | 0.0233 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic | ShortMissing |  1.928 ns | 0.0174 ns | 0.0091 ns |     - |     - |     - |         - |
