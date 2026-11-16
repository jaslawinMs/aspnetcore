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
|   **PreparedOwner** |             **Absent** | **30.35 μs** | **16.713 μs** | **8.741 μs** | **0.3307** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |             Absent | 16.59 μs |  4.509 μs | 2.358 μs | 0.4433 |     - |     - |     18 KB |
|   **PreparedOwner** |    **EndpointDefault** | **12.83 μs** |  **0.329 μs** | **0.172 μs** | **0.3874** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |    EndpointDefault | 15.63 μs |  0.478 μs | 0.250 μs | 0.4584 |     - |     - |     20 KB |
|   **PreparedOwner** | **FalseOverridesItem** | **13.15 μs** |  **0.299 μs** | **0.156 μs** | **0.3923** |     **-** |     **-** |     **15 KB** |
| PublicChallenge | FalseOverridesItem | 15.34 μs |  0.235 μs | 0.123 μs | 0.4699 |     - |     - |     20 KB |
|   **PreparedOwner** |          **ItemFalse** | **12.98 μs** |  **0.244 μs** | **0.128 μs** | **0.3866** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          ItemFalse | 15.31 μs |  0.980 μs | 0.512 μs | 0.4562 |     - |     - |     19 KB |
|   **PreparedOwner** |           **ItemTrue** | **13.13 μs** |  **0.398 μs** | **0.208 μs** | **0.3842** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |           ItemTrue | 15.48 μs |  0.425 μs | 0.222 μs | 0.4699 |     - |     - |     19 KB |
|   **PreparedOwner** |       **ItemVerbatim** | **13.80 μs** |  **0.969 μs** | **0.507 μs** | **0.4015** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |       ItemVerbatim | 16.30 μs |  0.420 μs | 0.220 μs | 0.4883 |     - |     - |     21 KB |
|   **PreparedOwner** |      **NullKeepsItem** | **13.40 μs** |  **0.348 μs** | **0.182 μs** | **0.4032** |     **-** |     **-** |     **16 KB** |
| PublicChallenge |      NullKeepsItem | 15.90 μs |  0.487 μs | 0.255 μs | 0.4858 |     - |     - |     21 KB |
|   **PreparedOwner** |  **TrueOverridesItem** | **13.06 μs** |  **0.531 μs** | **0.278 μs** | **0.3906** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |  TrueOverridesItem | 15.33 μs |  0.478 μs | 0.250 μs | 0.4551 |     - |     - |     20 KB |
|   **PreparedOwner** |         **TypedFalse** | **12.39 μs** |  **0.429 μs** | **0.224 μs** | **0.3655** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |         TypedFalse | 15.72 μs |  0.667 μs | 0.349 μs | 0.4699 |     - |     - |     19 KB |
|   **PreparedOwner** |   **TypedFalseNoPkce** | **10.74 μs** |  **0.236 μs** | **0.123 μs** | **0.3146** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |   TypedFalseNoPkce | 13.18 μs |  0.440 μs | 0.230 μs | 0.3923 |     - |     - |     16 KB |
|   **PreparedOwner** |          **TypedNull** | **12.36 μs** |  **0.733 μs** | **0.384 μs** | **0.3648** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |          TypedNull | 15.21 μs |  0.456 μs | 0.239 μs | 0.4540 |     - |     - |     19 KB |
|   **PreparedOwner** |          **TypedTrue** | **12.52 μs** |  **0.297 μs** | **0.155 μs** | **0.3728** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          TypedTrue | 15.46 μs |  0.420 μs | 0.219 μs | 0.4664 |     - |     - |     19 KB |
|   **PreparedOwner** |    **TypedTrueNoPkce** | **10.85 μs** |  **0.255 μs** | **0.133 μs** | **0.3222** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |    TypedTrueNoPkce | 13.46 μs |  0.928 μs | 0.485 μs | 0.3850 |     - |     - |     16 KB |
