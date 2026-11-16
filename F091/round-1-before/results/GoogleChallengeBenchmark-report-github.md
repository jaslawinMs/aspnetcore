``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|          Method |            Profile |     Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |------------------- |---------:|----------:|----------:|-------:|------:|------:|----------:|
|   **PreparedOwner** |             **Absent** | **30.88 μs** | **20.360 μs** | **10.648 μs** | **0.3189** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |             Absent | 15.21 μs |  0.331 μs |  0.173 μs | 0.4340 |     - |     - |     18 KB |
|   **PreparedOwner** |    **EndpointDefault** | **12.68 μs** |  **0.327 μs** |  **0.171 μs** | **0.3773** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |    EndpointDefault | 15.70 μs |  0.412 μs |  0.215 μs | 0.4562 |     - |     - |     20 KB |
|   **PreparedOwner** | **FalseOverridesItem** | **13.15 μs** |  **0.507 μs** |  **0.265 μs** | **0.3964** |     **-** |     **-** |     **15 KB** |
| PublicChallenge | FalseOverridesItem | 15.35 μs |  0.598 μs |  0.313 μs | 0.4573 |     - |     - |     20 KB |
|   **PreparedOwner** |          **ItemFalse** | **12.90 μs** |  **0.262 μs** |  **0.137 μs** | **0.3827** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          ItemFalse | 15.41 μs |  0.598 μs |  0.313 μs | 0.4496 |     - |     - |     19 KB |
|   **PreparedOwner** |           **ItemTrue** | **13.17 μs** |  **1.086 μs** |  **0.568 μs** | **0.3811** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |           ItemTrue | 15.41 μs |  1.076 μs |  0.563 μs | 0.4630 |     - |     - |     19 KB |
|   **PreparedOwner** |       **ItemVerbatim** | **13.17 μs** |  **0.369 μs** |  **0.193 μs** | **0.3858** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |       ItemVerbatim | 15.65 μs |  0.784 μs |  0.410 μs | 0.4630 |     - |     - |     21 KB |
|   **PreparedOwner** |      **NullKeepsItem** | **13.81 μs** |  **1.226 μs** |  **0.641 μs** | **0.3964** |     **-** |     **-** |     **16 KB** |
| PublicChallenge |      NullKeepsItem | 15.85 μs |  0.399 μs |  0.209 μs | 0.4832 |     - |     - |     21 KB |
|   **PreparedOwner** |  **TrueOverridesItem** | **13.28 μs** |  **0.143 μs** |  **0.075 μs** | **0.3914** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |  TrueOverridesItem | 15.38 μs |  0.462 μs |  0.242 μs | 0.4676 |     - |     - |     20 KB |
|   **PreparedOwner** |         **TypedFalse** | **12.61 μs** |  **1.063 μs** |  **0.556 μs** | **0.3773** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |         TypedFalse | 15.39 μs |  0.483 μs |  0.253 μs | 0.4562 |     - |     - |     19 KB |
|   **PreparedOwner** |   **TypedFalseNoPkce** | **10.70 μs** |  **0.580 μs** |  **0.303 μs** | **0.3216** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |   TypedFalseNoPkce | 13.16 μs |  0.218 μs |  0.114 μs | 0.4024 |     - |     - |     16 KB |
|   **PreparedOwner** |          **TypedNull** | **12.18 μs** |  **0.222 μs** |  **0.116 μs** | **0.3641** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |          TypedNull | 15.22 μs |  0.441 μs |  0.231 μs | 0.4518 |     - |     - |     19 KB |
|   **PreparedOwner** |          **TypedTrue** | **12.66 μs** |  **1.040 μs** |  **0.544 μs** | **0.3698** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          TypedTrue | 15.34 μs |  0.454 μs |  0.237 μs | 0.4573 |     - |     - |     19 KB |
|   **PreparedOwner** |    **TypedTrueNoPkce** | **10.72 μs** |  **0.619 μs** |  **0.324 μs** | **0.3167** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |    TypedTrueNoPkce | 13.33 μs |  0.753 μs |  0.394 μs | 0.3906 |     - |     - |     16 KB |
