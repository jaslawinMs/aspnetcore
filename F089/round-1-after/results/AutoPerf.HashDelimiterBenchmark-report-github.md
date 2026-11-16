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
|    **ActualNoImportOwner** |    **LongEmpty** | **17.371 ns** | **0.0518 ns** | **0.0271 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |    LongEmpty | 16.886 ns | 0.0916 ns | 0.0479 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |    LongEmpty | 15.777 ns | 0.0974 ns | 0.0509 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |  **LongMissing** | **17.170 ns** | **0.1424 ns** | **0.0745 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |  LongMissing | 16.611 ns | 0.1010 ns | 0.0528 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |  LongMissing | 16.124 ns | 0.2087 ns | 0.1091 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |   **QueryEmpty** |  **4.200 ns** | **0.0618 ns** | **0.0323 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |   QueryEmpty |  3.265 ns | 0.0195 ns | 0.0102 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |   QueryEmpty |  1.641 ns | 0.0658 ns | 0.0344 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** | **QueryMissing** |  **4.598 ns** | **0.0784 ns** | **0.0410 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic | QueryMissing |  3.544 ns | 0.0777 ns | 0.0406 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic | QueryMissing |  1.925 ns | 0.0128 ns | 0.0067 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |   **ShortEmpty** |  **4.210 ns** | **0.0513 ns** | **0.0268 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |   ShortEmpty |  3.314 ns | 0.1482 ns | 0.0775 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |   ShortEmpty |  1.627 ns | 0.0381 ns | 0.0199 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** | **ShortMissing** |  **4.837 ns** | **0.0720 ns** | **0.0377 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic | ShortMissing |  3.540 ns | 0.0501 ns | 0.0262 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic | ShortMissing |  1.933 ns | 0.0494 ns | 0.0259 ns |     - |     - |     - |         - |
