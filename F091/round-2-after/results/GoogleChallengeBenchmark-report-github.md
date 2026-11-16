``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|          Method |            Profile |     Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |------------------- |---------:|----------:|---------:|-------:|------:|------:|----------:|
|   **PreparedOwner** |             **Absent** | **31.68 μs** | **18.435 μs** | **9.642 μs** | **0.2841** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |             Absent | 15.30 μs |  0.223 μs | 0.117 μs | 0.4551 |     - |     - |     18 KB |
|   **PreparedOwner** |    **EndpointDefault** | **12.92 μs** |  **0.396 μs** | **0.207 μs** | **0.3939** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |    EndpointDefault | 15.73 μs |  0.385 μs | 0.201 μs | 0.4699 |     - |     - |     20 KB |
|   **PreparedOwner** | **FalseOverridesItem** | **13.29 μs** |  **0.717 μs** | **0.375 μs** | **0.3947** |     **-** |     **-** |     **15 KB** |
| PublicChallenge | FalseOverridesItem | 16.05 μs |  1.100 μs | 0.575 μs | 0.4676 |     - |     - |     20 KB |
|   **PreparedOwner** |          **ItemFalse** | **13.33 μs** |  **1.226 μs** | **0.641 μs** | **0.3850** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          ItemFalse | 15.58 μs |  0.285 μs | 0.149 μs | 0.4607 |     - |     - |     19 KB |
|   **PreparedOwner** |           **ItemTrue** | **13.21 μs** |  **0.724 μs** | **0.379 μs** | **0.3796** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |           ItemTrue | 15.46 μs |  0.319 μs | 0.167 μs | 0.4688 |     - |     - |     19 KB |
|   **PreparedOwner** |       **ItemVerbatim** | **13.22 μs** |  **0.221 μs** | **0.116 μs** | **0.3931** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |       ItemVerbatim | 15.61 μs |  0.409 μs | 0.214 μs | 0.4735 |     - |     - |     21 KB |
|   **PreparedOwner** |      **NullKeepsItem** | **13.41 μs** |  **0.260 μs** | **0.136 μs** | **0.3998** |     **-** |     **-** |     **16 KB** |
| PublicChallenge |      NullKeepsItem | 15.85 μs |  0.305 μs | 0.159 μs | 0.4747 |     - |     - |     21 KB |
|   **PreparedOwner** |  **TrueOverridesItem** | **13.48 μs** |  **0.113 μs** | **0.059 μs** | **0.3981** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |  TrueOverridesItem | 16.72 μs |  1.010 μs | 0.528 μs | 0.4921 |     - |     - |     20 KB |
|   **PreparedOwner** |         **TypedFalse** | **13.12 μs** |  **0.214 μs** | **0.112 μs** | **0.3923** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |         TypedFalse | 16.26 μs |  0.203 μs | 0.106 μs | 0.4858 |     - |     - |     19 KB |
|   **PreparedOwner** |   **TypedFalseNoPkce** | **11.10 μs** |  **0.837 μs** | **0.438 μs** | **0.3227** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |   TypedFalseNoPkce | 13.63 μs |  0.234 μs | 0.123 μs | 0.4121 |     - |     - |     16 KB |
|   **PreparedOwner** |          **TypedNull** | **12.69 μs** |  **0.264 μs** | **0.138 μs** | **0.3758** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |          TypedNull | 15.79 μs |  0.249 μs | 0.130 μs | 0.4688 |     - |     - |     19 KB |
|   **PreparedOwner** |          **TypedTrue** | **12.84 μs** |  **0.322 μs** | **0.168 μs** | **0.3788** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          TypedTrue | 15.91 μs |  0.359 μs | 0.188 μs | 0.4735 |     - |     - |     19 KB |
|   **PreparedOwner** |    **TypedTrueNoPkce** | **11.12 μs** |  **1.005 μs** | **0.526 μs** | **0.3216** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |    TypedTrueNoPkce | 13.67 μs |  0.328 μs | 0.171 μs | 0.4050 |     - |     - |     16 KB |
