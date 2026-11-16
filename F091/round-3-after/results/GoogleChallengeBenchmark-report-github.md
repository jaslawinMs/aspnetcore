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
|   **PreparedOwner** |             **Absent** | **31.16 μs** | **18.189 μs** | **9.513 μs** | **0.3125** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |             Absent | 15.00 μs |  0.336 μs | 0.176 μs | 0.4325 |     - |     - |     18 KB |
|   **PreparedOwner** |    **EndpointDefault** | **12.71 μs** |  **0.193 μs** | **0.101 μs** | **0.3758** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |    EndpointDefault | 15.53 μs |  0.630 μs | 0.330 μs | 0.4596 |     - |     - |     20 KB |
|   **PreparedOwner** | **FalseOverridesItem** | **13.02 μs** |  **0.504 μs** | **0.264 μs** | **0.3906** |     **-** |     **-** |     **15 KB** |
| PublicChallenge | FalseOverridesItem | 15.13 μs |  0.505 μs | 0.264 μs | 0.4518 |     - |     - |     20 KB |
|   **PreparedOwner** |          **ItemFalse** | **12.84 μs** |  **0.250 μs** | **0.131 μs** | **0.3819** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          ItemFalse | 15.15 μs |  0.439 μs | 0.230 μs | 0.4529 |     - |     - |     19 KB |
|   **PreparedOwner** |           **ItemTrue** | **12.97 μs** |  **0.167 μs** | **0.088 μs** | **0.3834** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |           ItemTrue | 15.36 μs |  0.640 μs | 0.335 μs | 0.4584 |     - |     - |     19 KB |
|   **PreparedOwner** |       **ItemVerbatim** | **13.00 μs** |  **0.193 μs** | **0.101 μs** | **0.3939** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |       ItemVerbatim | 15.38 μs |  0.488 μs | 0.255 μs | 0.4584 |     - |     - |     21 KB |
|   **PreparedOwner** |      **NullKeepsItem** | **13.40 μs** |  **0.801 μs** | **0.419 μs** | **0.3939** |     **-** |     **-** |     **16 KB** |
| PublicChallenge |      NullKeepsItem | 15.66 μs |  1.544 μs | 0.808 μs | 0.4551 |     - |     - |     21 KB |
|   **PreparedOwner** |  **TrueOverridesItem** | **13.16 μs** |  **0.380 μs** | **0.199 μs** | **0.3956** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |  TrueOverridesItem | 15.24 μs |  0.480 μs | 0.251 μs | 0.4540 |     - |     - |     20 KB |
|   **PreparedOwner** |         **TypedFalse** | **12.47 μs** |  **0.222 μs** | **0.116 μs** | **0.3684** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |         TypedFalse | 15.76 μs |  0.898 μs | 0.469 μs | 0.4607 |     - |     - |     19 KB |
|   **PreparedOwner** |   **TypedFalseNoPkce** | **10.88 μs** |  **0.671 μs** | **0.351 μs** | **0.3205** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |   TypedFalseNoPkce | 13.29 μs |  0.397 μs | 0.208 μs | 0.4032 |     - |     - |     16 KB |
|   **PreparedOwner** |          **TypedNull** | **12.23 μs** |  **0.276 μs** | **0.144 μs** | **0.3648** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |          TypedNull | 15.26 μs |  0.382 μs | 0.200 μs | 0.4475 |     - |     - |     19 KB |
|   **PreparedOwner** |          **TypedTrue** | **12.43 μs** |  **0.229 μs** | **0.120 μs** | **0.3662** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          TypedTrue | 15.23 μs |  0.313 μs | 0.164 μs | 0.4584 |     - |     - |     19 KB |
|   **PreparedOwner** |    **TypedTrueNoPkce** | **10.61 μs** |  **0.315 μs** | **0.165 μs** | **0.3157** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |    TypedTrueNoPkce | 13.06 μs |  0.393 μs | 0.205 μs | 0.3989 |     - |     - |     16 KB |
