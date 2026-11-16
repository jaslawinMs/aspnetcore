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
|    **ActualNoImportOwner** |    **LongEmpty** | **17.812 ns** | **0.2014 ns** | **0.1053 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |    LongEmpty | 17.059 ns | 0.0600 ns | 0.0314 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |    LongEmpty | 16.088 ns | 0.2369 ns | 0.1239 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |  **LongMissing** | **17.629 ns** | **0.1076 ns** | **0.0563 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |  LongMissing | 16.756 ns | 0.1737 ns | 0.0908 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |  LongMissing | 16.057 ns | 0.1159 ns | 0.0606 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |   **QueryEmpty** |  **5.538 ns** | **0.0984 ns** | **0.0514 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |   QueryEmpty |  3.264 ns | 0.0712 ns | 0.0372 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |   QueryEmpty |  1.954 ns | 0.0357 ns | 0.0186 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** | **QueryMissing** |  **5.794 ns** | **0.0712 ns** | **0.0373 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic | QueryMissing |  3.558 ns | 0.0579 ns | 0.0303 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic | QueryMissing |  2.244 ns | 0.0181 ns | 0.0094 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** |   **ShortEmpty** |  **5.520 ns** | **0.1506 ns** | **0.0788 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic |   ShortEmpty |  3.256 ns | 0.0597 ns | 0.0312 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic |   ShortEmpty |  1.952 ns | 0.0527 ns | 0.0275 ns |     - |     - |     - |         - |
|    **ActualNoImportOwner** | **ShortMissing** |  **6.119 ns** | **0.0421 ns** | **0.0220 ns** |     **-** |     **-** |     **-** |         **-** |
| DirectStringDiagnostic | ShortMissing |  3.549 ns | 0.0283 ns | 0.0148 ns |     - |     - |     - |         - |
|   DirectCharDiagnostic | ShortMissing |  2.245 ns | 0.0191 ns | 0.0100 ns |     - |     - |     - |         - |
